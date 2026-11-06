import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { take } from 'rxjs';
import { Contact, ActiveView } from '../models/contact.model';
import { ChatMessage, ChatMessageApi, Conversacion } from '../models/chat.model';
import { ChatService } from './chat.service';
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

  readonly isOpen = signal(false);
  readonly activeView = signal<ActiveView>('contacts');
  readonly activeContact = signal<Contact | null>(null);
  readonly typing = signal(false);
  readonly typingName = signal('');

  readonly contacts = signal<Contact[]>([]);
  readonly chatHistories = signal<Record<string, ChatMessage[]>>({});
  readonly cargandoContactos = signal(false);
  /** Aviso para el panel: sin sesión no hay /api/chats que consultar. */
  readonly avisoContactos = signal<string | null>(null);

  get miId(): string {
    const id = this.auth.currentUser()?.id;
    return id && id !== '0' ? String(id) : '';
  }

  openContacts(): void {
    this.activeView.set('contacts');
    this.activeContact.set(null);
    this.isOpen.set(true);
    this.cargarConversaciones();
  }

  openPdf(): void {
    this.activeView.set('pdf');
    this.activeContact.set(null);
    this.isOpen.set(true);
  }

  openChat(contact: Contact): void {
    this.activeView.set('chat');
    const definitivo = this.preservarConversacion(contact);
    this.upsertContact(definitivo);
    this.activeContact.set(definitivo);

    this.contacts.update(list =>
      list.map(c => (c.id === definitivo.id ? { ...c, unread: 0 } : c))
    );
    this.isOpen.set(true);

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
        this.cargandoContactos.set(false);
        this.applyConversaciones(lista);
      },
      error: () => {
        this.cargandoContactos.set(false);
        this.avisoContactos.set('No se pudieron cargar tus conversaciones');
      },
    });
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
