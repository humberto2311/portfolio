import { Component, OnDestroy, OnInit, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EstadosService } from '../../core/services/estados.service';
import { GrupoEstados } from '../../core/models/estado.model';
import { AuthService } from '../../core/services/auth.service';
import { UserProfileService } from '../../core/services/user-profile.service';
import { PerfilService } from '../../core/services/perfil.service';
import { SidePanelService } from '../../core/services/side-panel.service';
import { NotasPersonasService } from '../../core/services/notas-personas.service';
import { DisenoService } from '../../core/services/diseno.service';

@Component({
  selector: 'app-estados-carrusel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './estados-carrusel.component.html',
  styleUrls: ['./estados-carrusel.component.scss']
})
export class EstadosCarruselComponent implements OnInit, OnDestroy {

  private estados = inject(EstadosService);
  private auth = inject(AuthService);
  private perfiles = inject(UserProfileService);
  private perfilSvc = inject(PerfilService);
  private notas = inject(NotasPersonasService);
  private diseno = inject(DisenoService);
  private svc = inject(SidePanelService);

  readonly recarga = input<number>(0);
  readonly soloTextoYAudio = input(false);
  readonly compacto = input(false);
  readonly ocultarCabecera = input(false);
  /** Pone un acceso al mapa al final de la fila. */
  readonly mapa = input(false);
  /** El avatar propio no abre la historia: muestra y edita la nota. */
  readonly propiaEsNota = input(false);
  /** Pinta la nota encima de cada avatar. Solo en Mensajes; en Inicio va apagado. */
  readonly conNota = input(false);

  /** Si es false, la nota propia se muestra pero no se edita (solo lectura). */
  readonly editarPropia = input(true);
  readonly cargados = output<GrupoEstados[]>();
  /** Clic en un avatar: abre su chat. */
  readonly abrirChat = output<{ id: string; nombre: string; avatar: string | null }>();
  /** La nota que se acaba de guardar desde el avatar grande (o null si se quitó). */
  readonly notaGuardada = input<string | null>(null);
  /** Clic en el avatar propio cuando `propiaEsNota`: hay que editar la nota. */
  readonly abrirNota = output<void>();
  readonly abrirCreador = output<void>();
  readonly abrirVisor = output<GrupoEstados>();

  readonly grupos = signal<GrupoEstados[]>([]);
  readonly cargando = signal(true);
  readonly avatarRoto = signal(false);

  /** Cuando llega, se pintan estas personas aunque no tengan historia. */
  readonly personas = input<Array<{ id: string; nombre: string; avatar?: string | null }>>([]);

  /** Lo que trae la bandeja del servidor, ya ordenado para mostrar. */
  readonly delServidor = computed(() => {
    const grupos = this.grupos();
    const mio = this.mio();
    const yo = this.auth.currentUser()?.id;

    return {
      propia: mio,
      // Quien tiene nota va primero; el resto después.
      ajenas: grupos
        .filter((grupo) => grupo.usuarioId !== yo)
        .filter((grupo) => !this.soloTextoYAudio() || grupo.estados.some((estado) => this.esTextoOAudio(estado)))
        .sort((a, b) => Number(!this.textoDe(a)) - Number(!this.textoDe(b)))
    };
  });

  readonly avatarPropio = computed(() => this.perfiles.avatar() ?? null);

  /** Solo mi avatar lleva mi diseño: el de los demás no debe heredarlo. */
  readonly disenoPropio = computed(() => !!this.diseno.propio()?.activo);

  notaDe(grupo: GrupoEstados | null): string {
    if (!grupo) return '';

    this.notas.pedir(grupo.usuarioId);

    return this.notas.nota(grupo.usuarioId);
  }

  /** La nota del propio usuario (el servidor la devuelve dentro de su historia). */
  /**
   * La nota propia: la de la historia, la del perfil o la que acaba de guardar
   * el usuario (el servicio la guarda al instante). Así se pinta siempre.
   */
  readonly notaPropia = computed(() =>
    this.notaGuardada()
    || this.textoDe(this.mio())
    || (this.perfilSvc.miPerfil()?.nota?.trim() || '')
    || (this.svc.notaPropia() || ''));

  /** Nombre del propio usuario, para el nombre del avatar. */
  readonly nombrePropio = computed(() => this.auth.currentUser()?.fullName?.split(' ')[0] ?? 'Tu nota');

  /** "Tú: ..." mientras haya nota; si no, "Mi historia". */
  readonly etiquetaPropia = computed(() => {
    const nota = this.notaPropia();

    return nota ? `Tú: ${nota}` : 'Mi historia';
  });
  readonly mio = computed(() =>
    this.grupos().find((grupo) => grupo.usuarioId === this.auth.currentUser()?.id) ?? null);
  // Quien tiene historia con texto (su "nota") va primero; las historias sin
  // nota quedan al final. Así se ve de un vistazo quién dejó algo escrito.
  readonly otros = computed(() => {
    const ajenas = [...this.delServidor().ajenas];
    const conocidos = new Set(ajenas.map((grupo) => grupo.usuarioId));

    // Los seguidos que no tienen historia también aparecen, sin burbuja y al final.
    for (const persona of this.personas()) {
      if (!persona.id || conocidos.has(persona.id)) continue;

      conocidos.add(persona.id);
      ajenas.push({
        usuarioId: persona.id,
        nombre: persona.nombre,
        avatar: persona.avatar ?? null,
        todosVistos: true,
        total: 0,
        estados: []
      });
    }

    return ajenas;
  });

  private readonly rotos = signal<Set<string>>(new Set());

  readonly iniciales = computed(() => {
    const nombre = this.auth.currentUser()?.fullName ?? 'Yo';

    return nombre.split(' ').filter(Boolean).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
  });

  constructor() {
    effect(() => {
      this.recarga();
      this.cargar();
    });
  }

  ngOnInit(): void {
    this.cargar();
    this.perfiles.cargarMiAvatar();
    // El perfil propio trae la nota; se lee de miPerfil para no pisar un perfil ajeno abierto.
    if (!this.perfilSvc.miPerfil()) {
      this.perfilSvc.cargarPerfil().subscribe({ error: () => undefined });
    }
  }

  private destruido = false;

  ngOnDestroy(): void {
    this.destruido = true;
  }

  cargar(): void {
    this.estados.bandeja().subscribe({
      next: (grupos) => {
        const lista = grupos ?? [];

        this.grupos.set(lista);
        this.cargando.set(false);

        // Si el carrusel ya se destruyó (se cambió de vista), emitir rompe Angular.
        if (!this.destruido) this.cargados.emit(lista);
      },
      error: () => {
        this.grupos.set([]);
        this.cargando.set(false);
      }
    });
  }

  /** Solo el texto de la historia: es lo que se muestra como burbuja de nota. */
  textoDe(grupo: GrupoEstados | null): string {
    if (!grupo) return '';

    for (const estado of grupo.estados) {
      const texto = estado.texto?.trim();

      if (texto) return texto;
    }

    return '';
  }

  /** Resumen para el tooltip cuando la historia no trae texto. */
  burbujaDe(grupo: GrupoEstados): string {
    const primero = grupo.estados[0];

    if (!primero) return '';

    return this.textoDe(grupo) || (primero.musicaTitulo ? 'Con música' : 'Foto');
  }

  roto(usuarioId: string): boolean {
    return this.rotos().has(usuarioId);
  }

  marcarRoto(usuarioId: string): void {
    const siguiente = new Set(this.rotos());

    siguiente.add(usuarioId);
    this.rotos.set(siguiente);
  }

  esTextoOAudio(estado: { tipo: string; musicaTitulo: string | null }): boolean {
    return estado.tipo === 'TEXTO' || !!estado.musicaTitulo;
  }

  crear(): void {
    this.abrirCreador.emit();
  }

  ver(grupo: GrupoEstados): void {
    this.abrirVisor.emit(grupo);
  }

  /** Abre el chat de esa persona (no su historia). */
  chatear(grupo: GrupoEstados): void {
    this.abrirChat.emit({ id: grupo.usuarioId, nombre: grupo.nombre, avatar: grupo.avatar });
  }

  /** Clic en el avatar propio: se edita la nota (o se abre la historia). */
  tocarPropio(): void {
    if (!this.propiaEsNota()) {
      this.verMio();
      return;
    }

    // Solo lectura: no se abre nada al pulsar.
    if (!this.editarPropia()) return;

    // Se avisa para que el padre muestre el avatar en grande con el editor.
    this.abrirNota.emit();
  }

  verMio(): void {
    const propio = this.mio();

    if (propio) {
      this.abrirVisor.emit(propio);
      return;
    }

    this.abrirCreador.emit();
  }
}
