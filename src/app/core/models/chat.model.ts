export interface ChatMessage {
  sender: 'me' | 'them';
  text: string;
  time: string;
  id?: string;
  createdAt?: string;
  editedAt?: string;
  edited?: boolean;
  deleted?: boolean;
  canEdit?: boolean;
}

export interface ChatMessageApi {
  id: string;
  sessionId: string;
  senderId: string;
  senderName: string;
  receiverId: string | null;
  content: string;
  createdAt: string;
  editedAt?: string | null;
  editado?: boolean;
  eliminado?: boolean;
  puedeEditar?: boolean;
}

export interface ChatMessageSendApi {
  sessionId: string;
  senderId: string;
  receiverId: string | null;
  content: string;
}

export interface ChatMessageUpdateApi {
  content: string;
}



export interface Conversacion {
  id: string;
  estado: string;
  contraparteId: string;
  contraparteNombre: string;
  contraparteRol?: string | null;
  solicitanteId?: string | null;
  esSolicitud: boolean;
  soySolicitante: boolean;
  ultimoMensaje?: string | null;
  ultimoMensajeEn?: string | null;
  motivoReporte?: string | null;
  mensajes?: ChatMessageApi[];
}