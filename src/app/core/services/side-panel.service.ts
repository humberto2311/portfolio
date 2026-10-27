import { Injectable, signal } from '@angular/core';
import { Contact, ChatMessage, ActiveView } from '../models/contact.model';

@Injectable({ providedIn: 'root' })
export class SidePanelService {
  readonly isOpen = signal(false);
  readonly activeView = signal<ActiveView>('contacts');
  readonly activeContact = signal<Contact | null>(null);
  readonly typing = signal(false);
  readonly typingName = signal('');

  readonly aiContact: Contact = {
    id: 'ai-assistant',
    name: 'Asistente IA',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    status: 'online',
    statusText: 'IA Generativa Activa',
    lastMsg: '',
    time: '',
    unread: 0,
    isAi: true,
  };

  readonly contacts = signal<Contact[]>([
    {
      id: '1',
      name: 'Elena Rostova',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      status: 'online',
      statusText: 'En línea',
      lastMsg: '¿Nos vemos para el café más tarde?',
      time: '10:42 AM',
      unread: 2,
      responses: [
        '¡Hola! Qué bueno leerte. ¿A qué hora nos vemos?',
        'Me parece genial la idea.',
        'Déjame revisar mi agenda y te confirmo en un momento. ✨',
      ],
    },
    {
      id: '2',
      name: 'Carlos Mendoza',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      status: 'offline',
      statusText: 'Visto por última vez a las 09:15',
      lastMsg: 'Ya envié los informes del proyecto.',
      time: 'Ayer',
      unread: 0,
      responses: [
        'Hola, estuve revisando los números y se ven bien.',
        'Te respondo en cuanto vuelva a mi escritorio.',
        '¿Podemos agendar una llamada rápida?',
      ],
    },
    {
      id: '3',
      name: 'Dra. Sofia Chen',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      status: 'online',
      statusText: 'En línea',
      lastMsg: 'Los resultados de la investigación están listos.',
      time: '08:30 AM',
      unread: 1,
      responses: [
        'Hola. Adjunto los documentos de análisis.',
        'Los datos del trimestre se ven muy prometedores.',
      ],
    },
    {
      id: '4',
      name: 'Lucas Silva',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      status: 'away',
      statusText: 'Ausente',
      lastMsg: '¡El nuevo diseño está increíble! 🚀',
      time: 'Ayer',
      unread: 0,
      responses: ['¡Bro! Quedó súper genial.', 'Mañana lanzamos la versión beta.'],
    },
  ]);

  readonly chatHistories = signal<Record<string, ChatMessage[]>>({
    'ai-assistant': [
      { sender: 'them', text: '¡Hola! Soy tu Asistente IA. ¿En qué puedo ayudarte hoy?', time: 'Ahora' },
    ],
    '1': [
      { sender: 'them', text: '¡Hola! ¿Cómo va todo?', time: '10:30 AM' },
      { sender: 'me', text: '¡Hola Elena! Todo muy bien, ¿y tú?', time: '10:35 AM' },
      { sender: 'them', text: '¿Nos vemos para el café más tarde?', time: '10:42 AM' },
    ],
    '2': [{ sender: 'them', text: 'Ya envié los informes del proyecto.', time: 'Ayer' }],
    '3': [{ sender: 'them', text: 'Los resultados de la investigación están listos.', time: '08:30 AM' }],
    '4': [{ sender: 'them', text: '¡El nuevo diseño está increíble! 🚀', time: 'Ayer' }],
  });

  openContacts(): void {
    this.activeView.set('contacts');
    this.activeContact.set(null);
    this.isOpen.set(true);
  }

  openChat(contact: Contact): void {
    this.activeView.set('chat');
    this.activeContact.set(contact);

    if (!contact.isAi) {
      this.contacts.update(list =>
        list.map(c => (c.id === contact.id ? { ...c, unread: 0 } : c))
      );
    }
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

    if (!contact.isAi) {
      this.contacts.update(list =>
        list.map(c => (c.id === id ? { ...c, lastMsg: text, time } : c))
      );
    }

    this.triggerAutoReply(text);
  }

  private triggerAutoReply(userText: string): void {
    const contact = this.activeContact();
    if (!contact) return;

    this.typingName.set(contact.name);
    this.typing.set(true);

    const delay = Math.floor(Math.random() * 800) + 1000;

    setTimeout(() => {
      this.typing.set(false);
      const reply = contact.isAi
        ? this.generateAiResponse(userText)
        : (contact.responses ?? ['¡Entendido!', 'Te respondo pronto.'])[
            Math.floor(Math.random() * (contact.responses?.length ?? 2))
          ];

      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const id = contact.id;

      this.chatHistories.update(h => ({
        ...h,
        [id]: [...(h[id] || []), { sender: 'them', text: reply, time }],
      }));

      if (!contact.isAi) {
        this.contacts.update(list =>
          list.map(c => (c.id === id ? { ...c, lastMsg: reply, time } : c))
        );
      }
    }, delay);
  }

  private generateAiResponse(input: string): string {
    const lower = input.toLowerCase();
    if (lower.includes('hola') || lower.includes('buenas')) {
      return '¡Hola! Estoy listo para ayudarte. ¿Qué consulta deseas hacer?';
    }
    if (lower.includes('gracias')) {
      return '¡Es un gusto asistirte! ✨';
    }
    if (lower.includes('ayuda') || lower.includes('código') || lower.includes('codigo')) {
      return 'Puedo asistirte redactando código, sintetizando información o generando ideas creativas.';
    }
    const responses = [
      'He procesado tu solicitud. Te sugiero enfocar la solución con un diseño iterativo.',
      '¡Excelente punto! Los datos demuestran que esta estrategia optimiza los resultados.',
      'Entendido. ¿Deseas que profundice más sobre este tema?',
      'Análisis completado con éxito. Estoy a tu disposición para los siguientes pasos.',
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }
}