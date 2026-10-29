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
import { ChatApiService } from '../../../../../core/services/chat-api.service';
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
  private chatApi = inject(ChatApiService);

  message = signal('');
  sending = signal(false);

  // 🔴 Ponlo en false cuando tus Contact.id sean UUIDs reales de UserProfile
  private readonly USE_MOCK = true;

  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;

  constructor() {
    effect(() => {
      // Auto-scroll cuando cambian mensajes o el indicador de typing
      this.svc.chatHistories();
      this.svc.typing();
      queueMicrotask(() => this.scrollToBottom());
    });

    // Carga historial real al abrir un contacto (no IA, no mock)
    effect(() => {
      const contact = this.svc.activeContact();
      if (!contact || contact.isAi || this.USE_MOCK) return;
      this.loadHistory(contact.id);
    });
  }

  get messages(): ChatMessage[] {
    const id = this.svc.activeContact()?.id;
    return id ? this.svc.chatHistories()[id] ?? [] : [];
  }

  send(): void {
    const text = this.message().trim();
    const contact = this.svc.activeContact();
    if (!text || !contact) return;

    // 1) Optimistic UI: pinta el mensaje YA
    this.svc.sendMessage(text);
    this.message.set('');

    // 2) Persiste en el backend (si no es IA ni mock)
    if (!contact.isAi && !this.USE_MOCK) {
      this.sending.set(true);
      this.chatApi.sendMessage({
        sessionId: this.sessionIdFor(contact.id),
        senderId: this.currentUserId(),
        receiverId: contact.id,
        content: text,
      }).pipe(take(1)).subscribe({
        next: (saved) => this.replaceLastMessage(contact.id, text, saved),
        error: (err) => console.error('Error enviando mensaje', err),
        complete: () => this.sending.set(false),
      });
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  // ============ Helpers ============

  private loadHistory(contactId: string): void {
    this.chatApi.getBySession(this.sessionIdFor(contactId))
      .pipe(take(1))
      .subscribe({
        next: (list) => {
          const me = this.currentUserId();
          const mapped: ChatMessage[] = list.map(m => ({
            sender: m.senderId === me ? 'me' : 'them',
            text: m.content,
            time: new Date(m.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            id: m.id,
            createdAt: m.createdAt,
          }));
          this.svc.chatHistories.update(h => ({
            ...h,
            [contactId]: mapped,
          }));
        },
        error: (err) => console.error('Error cargando historial', err),
      });
  }

  private replaceLastMessage(contactId: string, originalText: string, saved: ChatMessageApi): void {
    this.svc.chatHistories.update(h => {
      const list = [...(h[contactId] || [])];
      // Busca el último mensaje 'me' con ese texto (el optimista)
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].sender === 'me' && list[i].text === originalText) {
          list[i] = { ...list[i], id: saved.id, createdAt: saved.createdAt };
          break;
        }
      }
      return { ...h, [contactId]: list };
    });
  }

  private sessionIdFor(contactId: string): string {
    // 🔧 Ajústalo a tu modelo real:
    // - 1-a-1 determinista: min(a,b)__max(a,b)
    // - por sala: roomId
    // Por ahora usa contactId directo.
    return contactId;
  }

  private currentUserId(): string {
    // 🔧 Cámbialo por tu AuthService real
    return localStorage.getItem('userId') ?? '00000000-0000-0000-0000-000000000000';
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }
}