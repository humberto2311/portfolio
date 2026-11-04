import { Injectable, signal } from '@angular/core';
import { Contact, ChatMessage, ActiveView } from '../models/contact.model';

@Injectable({ providedIn: 'root' })
export class SidePanelService {
  readonly isOpen = signal(false);
  readonly activeView = signal<ActiveView>('contacts');
  readonly activeContact = signal<Contact | null>(null);
  readonly typing = signal(false);
  readonly typingName = signal('');

  readonly contacts = signal<Contact[]>([]);
  readonly chatHistories = signal<Record<string, ChatMessage[]>>({});

  openContacts(): void {
    this.activeView.set('contacts');
    this.activeContact.set(null);
    this.isOpen.set(true);
  }

  openPdf(): void {
    this.activeView.set('pdf');
    this.activeContact.set(null);
    this.isOpen.set(true);
  }

  openChat(contact: Contact): void {
    this.activeView.set('chat');
    this.activeContact.set(contact);

    this.contacts.update(list =>
      list.map(c => (c.id === contact.id ? { ...c, unread: 0 } : c))
    );
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  backToContacts(): void {
    this.activeView.set('contacts');
    this.activeContact.set(null);
  }


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


  setContacts(newContacts: Contact[]): void {
    this.contacts.set(newContacts);
  }
}