import { Component, OnInit, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstadosService } from '../../core/services/estados.service';
import { GrupoEstados } from '../../core/models/estado.model';
import { AuthService } from '../../core/services/auth.service';
import { UserProfileService } from '../../core/services/user-profile.service';

@Component({
  selector: 'app-estados-carrusel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estados-carrusel.component.html',
  styleUrls: ['./estados-carrusel.component.scss']
})
export class EstadosCarruselComponent implements OnInit {

  private estados = inject(EstadosService);
  private auth = inject(AuthService);
  private perfiles = inject(UserProfileService);

  readonly recarga = input<number>(0);
  readonly soloTextoYAudio = input(false);
  readonly compacto = input(false);
  readonly ocultarCabecera = input(false);
  readonly cargados = output<GrupoEstados[]>();
  readonly abrirCreador = output<void>();
  readonly abrirVisor = output<GrupoEstados>();

  readonly grupos = signal<GrupoEstados[]>([]);
  readonly cargando = signal(true);
  readonly avatarRoto = signal(false);

  readonly avatarPropio = computed(() => this.perfiles.avatar() ?? null);
  readonly mio = computed(() =>
    this.grupos().find((grupo) => grupo.usuarioId === this.auth.currentUser()?.id) ?? null);
  readonly otros = computed(() => this.grupos()
    .filter((grupo) => grupo.usuarioId !== this.auth.currentUser()?.id)
    .filter((grupo) => !this.soloTextoYAudio() || grupo.estados.some((estado) => this.esTextoOAudio(estado))));

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
  }

  cargar(): void {
    this.estados.bandeja().subscribe({
      next: (grupos) => {
        const lista = grupos ?? [];

        this.grupos.set(lista);
        this.cargados.emit(lista);
        this.cargando.set(false);
      },
      error: () => {
        this.grupos.set([]);
        this.cargando.set(false);
      }
    });
  }

  burbujaDe(grupo: GrupoEstados): string {
    const primero = grupo.estados[0];

    if (!primero) return '';

    if (primero.texto) return primero.texto;

    return primero.musicaTitulo ? 'Con música' : 'Foto';
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

  verMio(): void {
    const propio = this.mio();

    if (propio) {
      this.abrirVisor.emit(propio);
      return;
    }

    this.abrirCreador.emit();
  }
}
