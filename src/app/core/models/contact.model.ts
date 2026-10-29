import { ChatMessage } from './chat.model';

export type { ChatMessage };

export type ActiveView = 'contacts' | 'chat';

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
}