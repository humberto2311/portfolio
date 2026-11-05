export type ActiveView = 'contacts' | 'chat' | 'pdf';

export type EstadoConversacion = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'REPORTADA';

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  status?: 'online' | 'offline' | 'away';
  statusText: string;
  lastMsg: string;
  time: string;
  unread: number;
  isAi?: boolean;
  responses?: string[];
  fotoUrl?: string;
  gitUsername?: string;
  /** Id de la conversación en /api/chats; ausente mientras todavía no existe. */
  conversationId?: string;
  estado?: EstadoConversacion;
  esSolicitud?: boolean;
  soySolicitante?: boolean;
}
