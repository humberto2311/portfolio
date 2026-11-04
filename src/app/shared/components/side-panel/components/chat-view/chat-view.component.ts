import {
  Component,
  ElementRef,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { take } from 'rxjs';

import { SidePanelService } from '../../../../../core/services/side-panel.service';
import { ChatService } from '../../../../../core/services/chat.service';
import { ChatMessage, ChatMessageApi } from '../../../../../core/models/chat.model';

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
  editingId = signal<string | null>(null);

  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;

  constructor() {
    effect(() => {
      this.svc.chatHistories();
      this.svc.typing();
      queueMicrotask(() => this.scrollToBottom());
    });

    effect(() => {
      const contact = this.svc.activeContact();
      if (!contact) return;
      this.loadHistory(contact.id);
    });
  }

  get messages(): ChatMessage[] {
    const id = this.svc.activeContact()?.id;
    return id ? this.svc.chatHistories()[id] ?? [] : [];
  }

  get activeContactId(): string | null {
    return this.svc.activeContact()?.id ?? null;
  }

  send(): void {
    if (this.editingId()) {
      this.confirmEdit();
      return;
    }

    const text = this.message().trim();
    const contact = this.svc.activeContact();
    if (!text || !contact) return;

    // UI optimista
    this.svc.sendMessage(text);
    this.message.set('');

    this.sending.set(true);
    this.chatService.sendMessage({
      sessionId: this.sessionIdFor(contact.id),
      senderId: this.currentUserId(),
      receiverId: contact.id,
      content: text,
    }).pipe(take(1)).subscribe({
      next: (saved) => this.replaceLastMessage(contact.id, text, saved),
      error: (err) => {
        console.error('Error enviando mensaje', err);
        this.sending.set(false);
      },
      complete: () => this.sending.set(false),
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
    const contactId = this.activeContactId;
    if (!id || !text || !contactId) return;

    this.chatService.updateMessage(id, { content: text })
      .pipe(take(1))
      .subscribe({
        next: (updated) => {
          this.svc.chatHistories.update(h => {
            const list: ChatMessage[] = [...(h[contactId] || [])];
            const idx = list.findIndex(m => m.id === updated.id);
            if (idx >= 0) {
              list[idx] = {
                ...list[idx],
                text: updated.content,
                editedAt: updated.editedAt ?? undefined,
                edited: updated.editado ?? true,
                canEdit: updated.puedeEditar ?? false,
              };
            }
            return { ...h, [contactId]: list };
          });
          this.cancelEdit();
        },
        error: (err) => console.error('Error editando mensaje', err),
      });
  }

  remove(msg: ChatMessage): void {
    const contactId = this.activeContactId;
    if (!msg.id || !contactId) return;

    this.chatService.deleteMessage(msg.id)
      .pipe(take(1))
      .subscribe({
        next: (deleted) => {
          this.svc.chatHistories.update(h => {
            const list: ChatMessage[] = [...(h[contactId] || [])];
            const idx = list.findIndex(m => m.id === deleted.id);
            if (idx >= 0) {
              list[idx] = {
                ...list[idx],
                text: 'Mensaje eliminado',
                deleted: true,
                canEdit: false,
              };
            }
            return { ...h, [contactId]: list };
          });
        },
        error: (err) => console.error('Error eliminando mensaje', err),
      });
  }

  private loadHistory(contactId: string): void {
    this.chatService.getConversation(this.currentUserId(), contactId)
      .pipe(take(1))
      .subscribe({
        next: (list) => {
          const me = this.currentUserId();
          const mapped: ChatMessage[] = list.map(m => this.toUiMessage(m, me));
          this.svc.chatHistories.update(h => ({
            ...h,
            [contactId]: mapped,
          }));
        },
        error: (err) => console.error('Error cargando historial', err),
      });
  }

  private toUiMessage(m: ChatMessageApi, me: string): ChatMessage {
    return {
      sender: m.senderId === me ? 'me' : 'them',
      text: m.eliminado ? 'Mensaje eliminado' : m.content,
      time: new Date(m.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      id: m.id,
      createdAt: m.createdAt,
      editedAt: m.editedAt ?? undefined,
      edited: m.editado ?? false,
      deleted: m.eliminado ?? false,
      canEdit: m.puedeEditar ?? false,
    };
  }

  private replaceLastMessage(contactId: string, originalText: string, saved: ChatMessageApi): void {
    this.svc.chatHistories.update(h => {
      const list: ChatMessage[] = [...(h[contactId] || [])];
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].sender === 'me' && list[i].text === originalText) {
          list[i] = {
            ...list[i],
            id: saved.id,
            createdAt: saved.createdAt,
            editedAt: saved.editedAt ?? undefined,
            edited: saved.editado ?? false,
            deleted: saved.eliminado ?? false,
            canEdit: saved.puedeEditar ?? false,
          };
          break;
        }
      }
      return { ...h, [contactId]: list };
    });
  }

  private sessionIdFor(contactId: string): string {
    const me = this.currentUserId();
    return me < contactId ? `${me}_${contactId}` : `${contactId}_${me}`;
  }

  private currentUserId(): string {
    return localStorage.getItem('userId') ?? '00000000-0000-0000-0000-000000000000';
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}