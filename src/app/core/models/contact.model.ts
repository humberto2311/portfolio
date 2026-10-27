export type ContactStatus = 'online' | 'offline' | 'away';

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  status: ContactStatus;
  statusText: string;
  lastMsg: string;
  time: string;
  unread: number;
  responses?: string[];
  isAi?: boolean;
}

export interface ChatMessage {
  sender: 'me' | 'them';
  text: string;
  time: string;
}

export type ActiveView = 'contacts' | 'chat';