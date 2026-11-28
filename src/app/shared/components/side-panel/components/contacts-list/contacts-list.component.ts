import { Component, Input, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { SidePanelService } from '../../../../../core/services/side-panel.service';
import { EstadosService } from '../../../../../core/services/estados.service';
import { ChatService } from '../../../../../core/services/chat.service';
import { Contact } from '../../../../../core/models/contact.model';
import { UsuarioBuscado } from '../../../../../core/models/chat.model';
import { EstadosCarruselComponent } from '../../../../../features/estados/estados-carrusel.component';

@Component({
  selector: 'app-contacts-list',
  standalone: true,
  imports: [CommonModule, FormsModule, EstadosCarruselComponent],
  templateUrl: './contacts-list.component.html',
  styleUrls: ['./contacts-list.component.scss'],
})
export class ContactsListComponent implements OnInit, OnDestroy {
  svc = inject(SidePanelService);

  esMiAvatar(id: string | undefined): boolean {
    return !!id && id === this.svc.miId;
  }

  private chat = inject(ChatService);
  private estados = inject(EstadosService);

  /**
   * `true` = vista "Nuevo mensaje": título, buscador siempre visible y lista
   * limpia de contactos. `false` = bandeja de entrada normal.
   */
  @Input() modoNuevo = false;

  /**
   * Personas de la fila de avatares: los chats abiertos y los seguidos.
   * Salen con nota o sin ella, así la fila nunca queda vacía.
   */
  readonly personasDelCarrusel = computed(() => [
    ...this.svc.chatsActivos().map((contacto) => ({
      id: contacto.id,
      nombre: contacto.name,
      avatar: contacto.fotoUrl || contacto.avatar || null
    })),
    ...this.svc.solicitudes().map((contacto) => ({
      id: contacto.id,
      nombre: contacto.name,
      avatar: contacto.fotoUrl || contacto.avatar || null
    }))
  ]);

  /**
   * Clic en el avatar propio: se muestra el avatar en grande para escribir la
   * nota ahí mismo, sin ventana encima.
   */
  abrirNota(): void {
    this.svc.abrirNotaGrande();
  }

  /** Clic en un avatar: abre (o crea) el chat con esa persona. */
  abrirChatDe(persona: { id: string; nombre: string; avatar: string | null }): void {
    this.svc.abrirChatCon({ id: persona.id, name: persona.nombre, avatar: persona.avatar });
  }

  search = signal('');
  personas = signal<UsuarioBuscado[]>([]);
  buscando = signal(false);

  private readonly rotos = signal<Set<string>>(new Set());
  readonly conEstado = signal<Set<string>>(new Set());

  avatarRoto(id: string): boolean {
    return this.rotos().has(id);
  }

  marcarRoto(id: string): void {
    const siguiente = new Set(this.rotos());

    siguiente.add(id);
    this.rotos.set(siguiente);
  }

  tieneEstado(id: string): boolean {
    return this.conEstado().has(id);
  }

  private cargarEstados(): void {
    this.estados.bandeja().subscribe({
      next: (grupos) => {
        const con = new Set((grupos ?? [])
          .filter((grupo) => grupo.estados.length > 0 && !grupo.todosVistos)
          .map((grupo) => grupo.usuarioId));

        this.conEstado.set(con);
      },
      error: () => this.conEstado.set(new Set()),
    });
  }

  private tecleo = new Subject<string>();

  constructor() {
    this.tecleo
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((termino) =>
          termino.length < 2 ? of([] as UsuarioBuscado[]) : this.chat.buscarUsuarios(termino)
        )
      )
      .subscribe({
        next: (lista) => {
          this.personas.set(lista ?? []);
          this.buscando.set(false);
        },
        error: () => {
          this.personas.set([]);
          this.buscando.set(false);
        },
      });
  }

  ngOnInit(): void {
    this.svc.cargarConversaciones();
    this.cargarEstados();
    if (this.modoNuevo) {
      this.search.set('');
      this.personas.set([]);
    }
  }

  ngOnDestroy(): void {
    this.tecleo.complete();
  }

  /** ¿Se está escribiendo algo en el buscador? */
  get filtrando(): boolean {
    return this.search().trim().length > 0;
  }

  /** En "Nuevo mensaje" se listan contactos con chat y personas nuevas. */
  get contactosNuevo(): Contact[] {
    const yaListados = new Set(this.conversaciones.map((c) => c.id));
    const personas: Contact[] = this.sugerencias.map((p) => ({
      id: p.id,
      name: p.fullName || p.gitUsername || 'Usuario',
      avatar: p.avatarUrl ?? '',
      status: 'offline',
      statusText: p.gitUsername ? `@${p.gitUsername}` : '',
      lastMsg: '',
      time: '',
      unread: 0,
      gitUsername: p.gitUsername ?? undefined,
    }));
    return [...this.conversaciones.filter((c) => yaListados.has(c.id)), ...personas];
  }

  /** Conversaciones que coinciden con lo que se está escribiendo. */
  get conversaciones(): Contact[] {
    const q = this.search().toLowerCase();
    if (!q) return this.svc.contacts();
    return this.svc.contacts().filter(
      c => c.name.toLowerCase().includes(q) || c.lastMsg.toLowerCase().includes(q)
    );
  }

  get chatsPersonales(): Contact[] {
    return this.unicosPorPersona(
      this.conversaciones.filter((contacto) => !contacto.tipo || contacto.tipo === 'PERSONAL'),
    );
  }

  private unicosPorPersona(lista: Contact[]): Contact[] {
    const porPersona = new Map<string, Contact>();

    for (const contacto of lista) {
      const clave = contacto.id;
      const previo = porPersona.get(clave);

      if (!previo) {
        porPersona.set(clave, contacto);
        continue;
      }

      const fechaNueva = contacto.ultimoMensajeEn ? new Date(contacto.ultimoMensajeEn).getTime() : 0;
      const fechaPrevia = previo.ultimoMensajeEn ? new Date(previo.ultimoMensajeEn).getTime() : 0;

      if (fechaNueva >= fechaPrevia) porPersona.set(clave, contacto);
    }

    return [...porPersona.values()];
  }

  get chatsEmpresariales(): Contact[] {
    return this.conversaciones.filter((contacto) => contacto.tipo === 'EMPRESA_CLIENTE');
  }

  get chatsGrupales(): Contact[] {
    return this.conversaciones.filter((contacto) => contacto.tipo === 'EMPRESA_GRUPO');
  }

  get empresaId(): string | null {
    return this.svc.empresaActivaId();
  }

  abrirChatEmpresa(): void {
    const empresaId = this.empresaId;
    if (empresaId) this.svc.abrirChatDeEmpresa(empresaId);
  }

  abrirGrupoEmpresa(): void {
    const empresaId = this.empresaId;
    if (empresaId) this.svc.abrirGrupoDeEmpresa(empresaId);
  }

  /** Personas sin conversación abierta, devueltas por el buscador de perfiles. */
  get sugerencias(): UsuarioBuscado[] {
    const conChats = new Set(this.svc.contacts().map(c => c.id));
    return this.personas().filter(p => !conChats.has(p.id) && p.id !== this.svc.miId);
  }

  /** Solicitudes pendientes, para el contador de la cabecera. */
  get solicitudes(): Contact[] {
    return this.svc.solicitudes();
  }

  verSolicitudes(): void {
    this.svc.busqueda.set('');
    this.search.set('');
  }

  /** Botón "Chat": abre la conversación con el primer elegido. */
  abrirChatElegido(): void {
    const elegido = this.svc.destinatarios()[0];
    if (!elegido) return;

    const existente = this.svc.buscarContacto(elegido.id);
    if (existente) {
      this.select(existente);
      return;
    }
    this.svc.openChat({
      id: elegido.id,
      name: elegido.name,
      avatar: elegido.avatar ?? '',
      status: 'offline',
      statusText: '',
      lastMsg: '',
      time: '',
      unread: 0,
    });
  }

  estaElegido(id: string): boolean {
    return this.svc.destinatarios().some((p) => p.id === id);
  }

  select(contact: Contact): void {
    if (this.modoNuevo) {
      this.svc.cerrarVistaNueva();
      this.search.set('');
      this.personas.set([]);
    }
    this.svc.openChat(contact);
  }

  /** La conversación con esa persona nace con el primer mensaje, en ChatView. */
  seleccionarPersona(persona: UsuarioBuscado): void {
    if (this.modoNuevo) {
      this.svc.cerrarVistaNueva();
      this.search.set('');
      this.personas.set([]);
    }
    const existente = this.svc.buscarContacto(persona.id);
    if (existente) {
      this.svc.openChat(existente);
      return;
    }

    this.svc.openChat({
      id: persona.id,
      name: persona.fullName || persona.gitUsername || 'Usuario',
      avatar: '',
      status: 'offline',
      statusText: persona.gitUsername ? `@${persona.gitUsername}` : '',
      lastMsg: '',
      time: '',
      unread: 0,
      gitUsername: persona.gitUsername ?? undefined,
    });
  }

  iniciales(nombre: string): string {
    if (!nombre) return '?';
    const partes = nombre.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  }

  onSearch(value: string): void {
    const termino = value.trim();
    this.search.set(termino);
    this.svc.busqueda.set(termino);
    this.buscando.set(termino.length >= 2);
    this.tecleo.next(termino);
  }
}
