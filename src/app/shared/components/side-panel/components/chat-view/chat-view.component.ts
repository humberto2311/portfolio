import {
  Component,
  ElementRef,
  ViewChild,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { take } from 'rxjs';

import { SidePanelService } from '../../../../../core/services/side-panel.service';
import { ChatService } from '../../../../../core/services/chat.service';
import { ChatMessage } from '../../../../../core/models/chat.model';
import { Contact } from '../../../../../core/models/contact.model';

@Component({
  selector: 'app-chat-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-view.component.html',
  styleUrls: ['./chat-view.component.scss'],
})
export class ChatViewComponent {
  svc = inject(SidePanelService);
  private chatService = inject(ChatService);

  message = signal('');
  sending = signal(false);
  cargando = signal(false);
  editingId = signal<string | null>(null);
  error = signal<string | null>(null);

  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;

  /** Clave de la última carga: evita pedir dos veces la misma conversación. */
  private ultimaCarga = '';

  constructor() {
    effect(() => {
      this.svc.chatHistories();
      this.svc.typing();
      queueMicrotask(() => this.scrollToBottom());
    });

    effect(() => {
      const contact = this.svc.activeContact();
      const clave = contact ? `${contact.id}|${contact.conversationId ?? 'nueva'}` : '';
      if (!clave || clave === this.ultimaCarga) return;

      this.ultimaCarga = clave;
      untracked(() => this.cargarHistorial(contact!));
    });
  }

  get messages(): ChatMessage[] {
    const id = this.svc.activeContact()?.id;
    return id ? this.svc.chatHistories()[id] ?? [] : [];
  }

  /** El backend admite mensajes en ACEPTADA, o en PENDIENTE siendo quien los solicitó. */
  get puedeEscribir(): boolean {
    const contact = this.svc.activeContact();
    if (!contact) return false;
    if (!contact.estado || contact.estado === 'ACEPTADA') return true;
    return contact.estado === 'PENDIENTE' && contact.soySolicitante === true;
  }

  /** Me llegó una solicitud todavía sin responder. */
  get esSolicitudPendiente(): boolean {
    const contact = this.svc.activeContact();
    return contact?.estado === 'PENDIENTE' && contact?.esSolicitud === true;
  }

  get conversacionCerrada(): boolean {
    const estado = this.svc.activeContact()?.estado;
    return estado === 'RECHAZADA' || estado === 'REPORTADA';
  }

  send(): void {
    if (this.editingId()) {
      this.confirmEdit();
      return;
    }

    const text = this.message().trim();
    const contact = this.svc.activeContact();
    if (!text || !contact || !this.puedeEscribir) return;

    // UI optimista
    this.svc.sendMessage(text);
    this.message.set('');
    this.error.set(null);
    this.sending.set(true);

    // Sin conversación previa, la primera petición la crea.
    const peticion = contact.conversationId
      ? this.chatService.responder(contact.conversationId, text)
      : this.chatService.enviar(contact.id, text);

    peticion.pipe(take(1)).subscribe({
      next: (conversacion) => {
        this.sending.set(false);
        this.svc.aplicarConversacion(conversacion);
        this.ultimaCarga = `${contact.id}|${conversacion.id}`;
      },
      error: (err) => {
        this.sending.set(false);
        this.svc.setHistorial(
          contact.id,
          this.messages.filter(m => !(m.sender === 'me' && m.text === text && !m.id))
        );
        this.error.set(this.mensajeError(err, 'No se pudo enviar el mensaje'));
      },
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
    if (event.key === 'Escape' && this.editingId()) {
      this.cancelEdit();
    }
  }

  startEdit(msg: ChatMessage): void {
    if (!msg.id || !msg.canEdit) return;
    this.editingId.set(msg.id);
    this.message.set(msg.text);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.message.set('');
  }

  confirmEdit(): void {
    const id = this.editingId();
    const text = this.message().trim();
    const contact = this.svc.activeContact();
    if (!id || !text || !contact) return;

    this.error.set(null);
    this.chatService.editarMensaje(id, { content: text })
      .pipe(take(1))
      .subscribe({
        next: (updated) => {
          this.svc.actualizarMensaje(contact.id, this.svc.mensajeAUi(updated, contact.id));
          this.cancelEdit();
        },
        error: (err) =>
          this.error.set(this.mensajeError(err, 'No se pudo editar el mensaje')),
      });
  }

  remove(msg: ChatMessage): void {
    const contact = this.svc.activeContact();
    if (!msg.id || !contact) return;

    this.error.set(null);
    this.chatService.borrarMensaje(msg.id)
      .pipe(take(1))
      .subscribe({
        next: (deleted) =>
          this.svc.actualizarMensaje(contact.id, this.svc.mensajeAUi(deleted, contact.id)),
        error: (err) =>
          this.error.set(this.mensajeError(err, 'No se pudo eliminar el mensaje')),
      });
  }

  aceptarSolicitud(): void {
    this.resolverSolicitud('aceptar');
  }

  rechazarSolicitud(): void {
    this.resolverSolicitud('rechazar');
  }

  reintentar(): void {
    const contact = this.svc.activeContact();
    if (!contact) return;
    this.ultimaCarga = '';
    this.cargarHistorial(contact);
  }

  private cargarHistorial(contact: Contact): void {
    if (!contact.conversationId) {
      this.svc.setHistorial(contact.id, []);
      return;
    }

    this.cargando.set(true);
    this.error.set(null);

    this.chatService.abrir(contact.conversationId)
      .pipe(take(1))
      .subscribe({
        next: (conversacion) => {
          this.cargando.set(false);
          this.svc.aplicarConversacion(conversacion);
        },
        error: (err) => {
          this.cargando.set(false);
          this.error.set(this.mensajeError(err, 'No se pudo cargar la conversación'));
        },
      });
  }

  private resolverSolicitud(accion: 'aceptar' | 'rechazar'): void {
    const contact = this.svc.activeContact();
    const conversacionId = contact?.conversationId;
    if (!contact || !conversacionId) return;

    this.error.set(null);
    const peticion = accion === 'aceptar'
      ? this.chatService.aceptar(conversacionId)
      : this.chatService.rechazar(conversacionId);

    peticion.pipe(take(1)).subscribe({
      next: (conversacion) => this.svc.aplicarConversacion(conversacion),
      error: (err) =>
        this.error.set(this.mensajeError(err, 'No se pudo responder la solicitud')),
    });
  }

  private mensajeError(err: any, porDefecto: string): string {
    const detalle = err?.error?.message ?? err?.error?.error;
    return typeof detalle === 'string' && detalle ? detalle : porDefecto;
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}