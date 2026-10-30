export interface ChatMessage {
  id?: string;
  sender: 'me' | 'them';
  text: string;
  time: string;
  createdAt?: string ; 
}

export type ActiveView = 'contacts' | 'chat' | 'pdf';

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'away';
  statusText: string;
  lastMsg: string;
  time: string;
  unread: number;
  isAi?: boolean;
  responses?: string[];
  fotoUrl?: string;
}