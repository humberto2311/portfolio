import { Injectable, computed, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { take } from 'rxjs';
import { Contact, ActiveView } from '../models/contact.model';
import { ChatMessage, ChatMessageApi, Conversacion } from '../models/chat.model';
import { ChatService } from './chat.service';
import { EmpresaService } from './empresa.service';
import { ChatEmpresa } from '../models/chat.model';
import { AuthService } from './auth.service';

/** Lo mínimo que hace falta para abrir un chat desde una tarjeta de persona. */
export interface DestinoChat {
  id: string;
  name: string;
  avatar?: string | null;
  gitUsername?: string | null;
  statusText?: string;
}

@Injectable({ providedIn: 'root' })
export class SidePanelService {
  private chatService = inject(ChatService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private empresa = inject(EmpresaService);

  readonly isOpen = signal(false);

  /**
   * Se está en la página de Mensajes a pantalla completa. Ahí el panel flotante
   * no existe: los chats se abren en la columna derecha, no en un lateral.
   */
  readonly enPaginaCompleta = signal(false);

  /** Página donde estaba el usuario al pedir pantalla completa (para volver). */
  readonly paginaAnterior = signal<string | null>(null);

  /** El modal "Importar hoja de vida" está abierto (vive fuera del panel). */
  readonly vistaCvAbierta = signal(false);

  /** El buscador de la bandeja nace plegado: la lupa de la cabecera lo abre. */
  readonly buscadorAbierto = signal(false);

  /** Hilo de búsqueda: se limpia al plegar, para que no quede un filtro fantasma. */
  readonly busqueda = signal('');

  alternarBuscador(): void {
    const abriendo = !this.buscadorAbierto();
    this.buscadorAbierto.set(abriendo);
    if (!abriendo) this.busqueda.set('');
  }

  /**
   * Vista "Nuevo mensaje" (el lápiz de la cabecera, como en Instagram): título,
   * buscador integrado y la lista de contactos. Al elegir uno se abre su chat.
   */
  readonly vistaNueva = signal(false);

  abrirVistaNueva(): void {
    this.vistaNueva.set(true);
    this.activeView.set('nuevo');
    this.activeContact.set(null);
    if (!this.enPaginaCompleta()) {
      this.isOpen.set(true);
    }
    this.busqueda.set('');
    this.cargarConversaciones();
  }

  /** Cancelar / volver desde "Nuevo mensaje" a la bandeja. */
  cerrarVistaNueva(): void {
    this.vistaNueva.set(false);
    this.busqueda.set('');
    this.activeView.set('contacts');
  }

  /** Chips de destinatarios elegidos en "Nuevo mensaje" (aún no usados por el backend). */
  readonly destinatarios = signal<Array<{ id: string; name: string; avatar?: string }>>([]);

  alternarDestinatario(persona: { id: string; name: string; avatar?: string }): void {
    this.destinatarios.update((lista) =>
      lista.some((p) => p.id === persona.id)
        ? lista.filter((p) => p.id !== persona.id)
        : [...lista, persona],
    );
  }

  quitarDestinatario(id: string): void {
    this.destinatarios.update((lista) => lista.filter((p) => p.id !== id));
  }

  readonly activeView = signal<ActiveView>('contacts');
  readonly activeContact = signal<Contact | null>(null);
  readonly typing = signal(false);
  readonly typingName = signal('');

  readonly contacts = signal<Contact[]>([]);
  readonly chatHistories = signal<Record<string, ChatMessage[]>>({});
  readonly cargandoContactos = signal(false);
  /** Aviso para el panel: sin sesión no hay /api/chats que consultar. */
  readonly avisoContactos = signal<string | null>(null);

  empresaActivaId(): string | null {
    return this.empresa.activaId();
  }

  /** Foto del usuario de la sesión: encabeza el carrusel de notas. */
  miAvatar(): string {
    const usuario = this.auth.currentUser() as
      | { avatarUrl?: string; foto?: string; gitUsername?: string }
      | null;
    if (usuario?.avatarUrl || usuario?.foto) return usuario.avatarUrl ?? usuario.foto ?? '';
    return usuario?.gitUsername ? `https://github.com/${usuario.gitUsername}.png` : '';
  }

  get miId(): string {
    const id = this.auth.currentUser()?.id;
    return id && id !== '0' ? String(id) : '';
  }

  /** Conversaciones con algún mensaje: no cuentan las solicitudes pendientes ni los rechazos. */
  readonly chatsActivos = computed(() =>
    this.contacts().filter((c) => !c.esSolicitud && c.estado !== 'RECHAZADA'),
  );

  /** Solicitudes de chat sin aceptar (se muestran en la pastilla para que no se pierdan). */
  readonly solicitudes = computed(() =>
    this.contacts().filter((c) => c.esSolicitud && c.estado !== 'RECHAZADA' && c.estado !== 'ACEPTADA'),
  );

  /** Cuántas van sin abrir: el badge de la pastilla de Mensajes. */
  readonly sinLeer = computed(() =>
    this.contacts().filter((c) => !c.esSolicitud && c.estado !== 'RECHAZADA' && c.leido === false).length,
  );

  /** Avatares de las últimas conversaciones, para la pastilla (estilo Instagram). */
  readonly ultimosAvatares = computed(() =>
    this.chatsActivos()
      .slice(0, 3)
      .map((c) => ({ id: c.id, nombre: c.name, avatar: c.avatar })),
  );

  /**
   * Cómo se ve el panel cuando está abierto. Por defecto, minimizado:
   * - 'ventana': tarjeta flotante abajo a la derecha (lo normal).
   * - 'pantalla': lo pide el usuario con ⤢, y entonces se abre el componente
   *   de Mensajes a página completa (/app/mensajes), no un panel estirado.
   */
  readonly modoVentana = signal(true);

  /** Pantalla completa: navega al componente de Mensajes y aparta el panel. */
  abrirPantallaCompleta(): void {
    const actual = this.router.url;
    if (actual && !actual.startsWith('/app/mensajes')) {
      this.paginaAnterior.set(actual);
    }
    this.modoVentana.set(false);
    this.isOpen.set(false);
    this.router.navigate(['/app/mensajes']);
  }

  /** Volver a la ventana minimizada: la pastilla reaparece donde estaba. */
  volverAVentana(): void {
    this.modoVentana.set(true);
    this.enPaginaCompleta.set(false);
  }

  /** El componente de Mensajes está en pantalla: el panel flotante no se pinta. */
  cerrarPanelFlotante(): void {
    this.isOpen.set(false);
    this.enPaginaCompleta.set(true);
  }

  /** Se salió de la página de Mensajes por cualquier vía (riel, atrás, enlaces). */
  salirDePaginaCompleta(): void {
    this.enPaginaCompleta.set(false);
    this.isOpen.set(false);
    this.modoVentana.set(true);
  }

  /** Compatibilidad con los botones que ya llamaban a esto. */
  alternarModoVentana(): void {
    if (this.modoVentana()) {
      this.abrirPantallaCompleta();
    } else {
      this.volverAVentana();
    }
  }

  /**
   * La pastilla de Mensajes no tiene botón de ocultar: siempre está, salvo en
   * modo empresa (ahí vive dentro de la barra de la empresa).
   */
  pastillaVisible(enEmpresa: boolean): boolean {
    return !enEmpresa;
  }

  /** Borra la marca antigua (versiones previas) que escondía la pastilla entre recargas. */
  limpiarPreferenciaAntigua(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.removeItem('nfc-pastilla-mensajes');
    } catch {
      /* modo privado: nada que limpiar */
    }
  }

  private leerPreferencia(clave: string): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      return localStorage.getItem(clave);
    } catch {
      return null;
    }
  }

  private guardarPreferencia(clave: string, valor: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(clave, valor);
    } catch {
      /* modo privado o cuota llena: no pasa nada */
    }
  }

  /**
   * true si el modal de importar CV está abierto. NO depende de que el panel de
   * Mensajes esté abierto: el modal vive fuera del panel desde que se movió.
   */
  importandoCv(): boolean {
    return this.vistaCvAbierta();
  }

  /** true si el panel está abierto justo en la vista de contactos. */
  enContactos(): boolean {
    return this.isOpen() && this.activeView() === 'contacts';
  }

  /** Llevar la conversación al fondo cada vez que se abre. */
  readonly scrollAlFinal = signal(0);

  /**
   * Botón de Mensajes de la barra: abre la bandeja o la cierra si ya estaba
   * abierta. Siempre vuelve a la lista de conversaciones (nunca deja el panel
   * en la vista de PDF, que era lo que hacía que "Mensajes" pareciera no abrir nada).
   */
  alternarMensajes(): void {
    if (this.enContactos()) {
      this.close();
      return;
    }
    this.openContacts();
  }

  /** Dentro de un chat: lleva el hilo al último mensaje (si no, se queda arriba). */
  irAlFinal(): void {
    this.scrollAlFinal.update((n) => n + 1);
  }

  openContacts(): void {
    this.buscadorAbierto.set(false);
    this.vistaNueva.set(false);
    this.busqueda.set('');
    this.activeView.set('contacts');
    this.activeContact.set(null);
    if (!this.enPaginaCompleta()) {
      this.isOpen.set(true);
    }
    this.cargarConversaciones();
  }

  /** Importar hoja de vida: ahora es un modal, no una vista del panel de Mensajes. */
  openPdf(): void {
    this.isOpen.set(false);
    this.activeContact.set(null);
    this.vistaCvAbierta.set(true);
  }

  cerrarPdf(): void {
    this.vistaCvAbierta.set(false);
    this.activeView.set('contacts');
  }

  openChat(contact: Contact): void {
    this.buscadorAbierto.set(false);
    this.vistaNueva.set(false);
    this.busqueda.set('');
    this.activeView.set('chat');
    const definitivo = this.preservarConversacion(contact);
    this.upsertContact(definitivo);
    this.activeContact.set(definitivo);

    this.contacts.update(list =>
      list.map(c => (c.id === definitivo.id ? { ...c, unread: 0, leido: true } : c))
    );

    // En la página de Mensajes el hilo vive en su columna: el panel no se abre.
    if (!this.enPaginaCompleta()) {
      this.isOpen.set(true);
    }

    // Un perfil puede abrirse sin saber aún que ya existe conversación con esa persona.
    if (!definitivo.conversationId) {
      this.cargarConversaciones();
    }
  }

  /** El avatar o el nombre de un chat abre el perfil de ESA persona, nunca el propio. */
  abrirPerfilDe(contact: { id: string; gitUsername?: string | null; isAi?: boolean } | null): void {
    if (!contact || contact.isAi) return;

    const destino = contact.gitUsername || contact.id;
    if (!destino) return;

    this.close();
    this.router.navigate(['/app/perfil', destino]);
  }

  close(): void {
    this.isOpen.set(false);
    this.vistaCvAbierta.set(false);
  }

  /**
   * Desde cualquier tarjeta de persona: abre el chat con ella. Si se pulsó en
   * una página del layout público, donde el panel no está montado, baja al área privada.
   */
  abrirChatCon(destino: DestinoChat): void {
    this.openChat({
      id: String(destino.id),
      name: destino.name,
      avatar: destino.avatar ?? '',
      status: 'offline',
      statusText: destino.statusText ?? (destino.gitUsername ? `@${destino.gitUsername}` : ''),
      lastMsg: '',
      time: '',
      unread: 0,
      gitUsername: destino.gitUsername ?? undefined,
    });

    if (isPlatformBrowser(this.platformId) && !this.router.url.startsWith('/app')) {
      this.router.navigate(['/app']);
    }
  }

  backToContacts(): void {
    this.activeView.set('contacts');
    this.activeContact.set(null);
    this.cargarConversaciones();
  }

  /** Mensaje optimista: se pinta ya y se confirma cuando responde el backend. */
  sendMessage(text: string): void {
    const contact = this.activeContact();
    if (!contact || !text.trim()) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const id = contact.id;

    this.chatHistories.update(h => ({
      ...h,
      [id]: [...(h[id] || []), { sender: 'me', text, time }],
    }));

    this.contacts.update(list =>
      list.map(c => (c.id === id ? { ...c, lastMsg: text, time } : c))
    );
  }

  /** Trae mis conversaciones reales de /api/chats y las mezcla con los contactos abiertos. */
  cargarConversaciones(): void {
    if (!this.auth.isAuthenticated()) {
      this.avisoContactos.set('Inicia sesión para ver tus chats');
      return;
    }

    this.avisoContactos.set(null);
    this.cargandoContactos.set(true);

    this.chatService.listar().pipe(take(1)).subscribe({
      next: (lista) => {
        this.applyConversaciones(this.unicosPorPersona(lista));
        this.cargarChatsDeEmpresa();
      },
      error: () => {
        this.cargandoContactos.set(false);
        this.avisoContactos.set('No se pudieron cargar tus conversaciones');
      },
    });
  }

  cargarChatsDeEmpresa(): void {
    const empresaId = this.empresa.activaId();
    if (!empresaId) {
      this.cargandoContactos.set(false);
      return;
    }

    this.chatService.misChatsDeEmpresa(empresaId).pipe(take(1)).subscribe({
      next: (chats) => {
        this.cargandoContactos.set(false);
        this.applyChatsEmpresa(chats, empresaId);
      },
      error: () => this.cargandoContactos.set(false),
    });
  }

  abrirChatDeEmpresa(empresaId: string): void {
    this.chatService.abrirChatEmpresa(empresaId).pipe(take(1)).subscribe({
      next: (chat) => this.entrarChatEmpresa(chat),
      error: () => this.avisoContactos.set('No se pudo abrir el chat con la empresa'),
    });
  }

  abrirGrupoDeEmpresa(empresaId: string): void {
    this.chatService.abrirGrupoEmpresa(empresaId).pipe(take(1)).subscribe({
      next: (chat) => this.entrarChatEmpresa(chat),
      error: () => this.avisoContactos.set('No se pudo abrir el chat del equipo'),
    });
  }

  private entrarChatEmpresa(chat: ChatEmpresa): void {
    const contacto = this.contactoDeEmpresa(chat);
    this.upsertContact(contacto);
    this.openChat(contacto);
  }

  private applyChatsEmpresa(chats: ChatEmpresa[], empresaId: string): void {
    const nuevos = chats
      .filter((chat) => chat.tipo !== 'PERSONAL')
      .map((chat) => this.contactoDeEmpresa(chat, empresaId));

    const personales = this.contacts().filter(
      (contacto) => !contacto.tipo || contacto.tipo === 'PERSONAL',
    );

    this.contacts.set([...this.sinDuplicados([...personales, ...nuevos])]);
  }

  private unicosPorPersona(lista: Conversacion[]): Conversacion[] {
    const porPersona = new Map<string, Conversacion>();

    for (const conversacion of lista) {
      const actual = porPersona.get(conversacion.contraparteId);
      if (!actual || this.masReciente(conversacion, actual)) {
        porPersona.set(conversacion.contraparteId, conversacion);
      }
    }

    return [...porPersona.values()].sort((a, b) => (this.fecha(b.ultimoMensajeEn) - this.fecha(a.ultimoMensajeEn)));
  }

  private masReciente(candidata: Conversacion, actual: Conversacion): boolean {
    const fechaCandidata = this.fecha(candidata.ultimoMensajeEn);
    const fechaActual = this.fecha(actual.ultimoMensajeEn);

    if (fechaCandidata !== fechaActual) return fechaCandidata > fechaActual;
    if (candidata.estado !== actual.estado) return candidata.estado === 'ACEPTADA';
    return false;
  }

  private fecha(valor: string | null | undefined): number {
    if (!valor) return 0;
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? 0 : fecha.getTime();
  }

  private sinDuplicados(lista: Contact[]): Contact[] {
    const porClave = new Map<string, Contact>();

    for (const contacto of lista) {
      const clave = `${contacto.tipo ?? 'PERSONAL'}|${(contacto.tipo ?? 'PERSONAL') === 'PERSONAL' ? contacto.id : contacto.conversationId ?? contacto.id}`;
      const previo = porClave.get(clave);

      porClave.set(clave, previo ? this.mezclarContacto(previo, contacto) : contacto);
    }

    return [...porClave.values()];
  }

  private contactoDeEmpresa(chat: ChatEmpresa, empresaId?: string): Contact {
    const clave = chat.usuarioId ?? chat.id;

    return {
      id: clave,
      name: chat.titulo,
      avatar: chat.tipo === 'EMPRESA_CLIENTE' ? (chat.empresaLogoUrl ?? chat.usuarioAvatar ?? '') : '',
      statusText: chat.subtitulo ?? '',
      lastMsg: chat.ultimoMensaje ?? '',
      time: this.horaDe(chat.ultimoMensajeEn),
      unread: 0,
      conversationId: chat.id,
      tipo: chat.tipo,
      etiqueta: chat.etiqueta,
      empresaId: chat.empresaId ?? empresaId ?? null,
      empresaNombre: chat.empresaNombre ?? null,
      empresaLogoUrl: chat.empresaLogoUrl ?? null,
      ultimoMensajeEn: chat.ultimoMensajeEn ?? null,
    };
  }

  private horaDe(valor: string | null | undefined): string {
    if (!valor) return '';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return '';
    return fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  buscarContacto(id: string): Contact | undefined {
    return this.contacts().find(c => c.id === id);
  }

  setHistorial(contactId: string, mensajes: ChatMessage[]): void {
    this.chatHistories.update(h => ({ ...h, [contactId]: mensajes }));
  }

  actualizarMensaje(contactId: string, mensaje: ChatMessage): void {
    this.chatHistories.update(h => {
      const list = [...(h[contactId] || [])];
      const idx = list.findIndex(m => m.id === mensaje.id);
      if (idx >= 0) list[idx] = mensaje;
      return { ...h, [contactId]: list };
    });
  }

  private applyConversaciones(lista: Conversacion[]): void {
    const nuevos = lista.map(c => this.toContact(c));
    const ids = new Set(nuevos.map(c => c.id));
    // Conserva contactos añadidos desde un perfil todavía sin conversación.
    const previos = new Map(this.contacts().map(c => [c.id, c] as const));
    const pendientes = this.contacts().filter(c => !ids.has(c.id));

    this.contacts.set([
      ...nuevos.map(c => this.mezclarContacto(previos.get(c.id), c)),
      ...pendientes,
    ]);

    // El contacto abierto puede haber ganado conversación o estado al refrescar.
    const abierto = this.activeContact();
    if (abierto) {
      const actualizado = this.buscarContacto(abierto.id);
      if (actualizado) this.activeContact.set(actualizado);
    }

    for (const conv of lista) {
      this.aplicarMensajes(conv);
    }
  }

  /** La conversación manda sobre estado y preview; el avatar puede venir del perfil abierto. */
  private mezclarContacto(previo: Contact | undefined, nuevo: Contact): Contact {
    if (!previo) return nuevo;

    return {
      ...nuevo,
      avatar: nuevo.avatar || previo.avatar,
      status: nuevo.status ?? previo.status,
      statusText: nuevo.statusText || previo.statusText,
      lastMsg: nuevo.lastMsg || previo.lastMsg,
      time: nuevo.time || previo.time,
      gitUsername: nuevo.gitUsername ?? previo.gitUsername,
      fotoUrl: nuevo.fotoUrl ?? previo.fotoUrl,
    };
  }

  /** Un contacto traído de un perfil no conoce su conversación: se hereda de la lista. */
  private preservarConversacion(contact: Contact): Contact {
    const previo = this.buscarContacto(contact.id);
    if (!previo) return contact;

    return {
      ...contact,
      conversationId: contact.conversationId ?? previo.conversationId,
      estado: contact.estado ?? previo.estado,
      esSolicitud: contact.esSolicitud ?? previo.esSolicitud,
      soySolicitante: contact.soySolicitante ?? previo.soySolicitante,
      avatar: contact.avatar || previo.avatar,
    };
  }

  /** Contacto + historial a partir de una conversación del backend. */
  aplicarConversacion(conversacion: Conversacion): Contact {
    const contact = this.toContact(conversacion);
    this.upsertContact(contact);
    this.activeContact.update(c => (c && c.id === contact.id ? contact : c));
    this.aplicarMensajes(conversacion);
    return contact;
  }

  private aplicarMensajes(c: Conversacion): void {
    if (!c.mensajes) return;
    this.setHistorial(
      c.contraparteId,
      c.mensajes.map(m => this.mensajeAUi(m, c.contraparteId))
    );
  }

  private upsertContact(contact: Contact): void {
    this.contacts.update(list => {
      const idx = list.findIndex(c => c.id === contact.id);
      if (idx < 0) return [contact, ...list];
      const previo = list[idx];
      const copiado = { ...previo, ...contact };
      return [...list.slice(0, idx), copiado, ...list.slice(idx + 1)];
    });
  }

  private toContact(c: Conversacion): Contact {
    return {
      id: c.contraparteId,
      name: c.contraparteNombre,
      avatar: '',
      status: 'offline',
      statusText: this.textoEstado(c),
      lastMsg: c.ultimoMensaje ?? '',
      time: this.hora(c.ultimoMensajeEn),
      unread: 0,
      conversationId: c.id,
      estado: c.estado as Contact['estado'],
      esSolicitud: c.esSolicitud,
      soySolicitante: c.soySolicitante,
      ultimoMensajeEn: c.ultimoMensajeEn,
    };
  }

  mensajeAUi(m: ChatMessageApi, contraparteId: string): ChatMessage {
    return {
      sender: m.senderId === contraparteId ? 'them' : 'me',
      text: m.eliminado ? 'Mensaje eliminado' : m.content,
      time: this.hora(m.createdAt),
      id: m.id,
      createdAt: m.createdAt,
      editedAt: m.editedAt ?? undefined,
      edited: m.editado ?? false,
      deleted: m.eliminado ?? false,
      canEdit: m.puedeEditar ?? false,
    };
  }

  private textoEstado(c: Conversacion): string {
    if (c.estado === 'PENDIENTE') return c.esSolicitud ? 'Solicitud pendiente' : 'Esperando respuesta';
    if (c.estado === 'RECHAZADA') return 'Conversación rechazada';
    if (c.estado === 'REPORTADA') return 'Conversación reportada';
    return '';
  }

  private hora(fecha?: string | null): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
