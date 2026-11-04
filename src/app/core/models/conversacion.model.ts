export type EstadoChat = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'REPORTADA';

export interface MensajeChat {
  id: string;
  sessionId?: string;
  senderId: string;
  senderName?: string;
  receiverId?: string;
  content: string;
  createdAt: string;
}

export interface Conversacion {
  id: string;
  estado: EstadoChat;
  contraparteId: string;
  contraparteNombre: string;
  solicitanteId?: string;
  /** true si la otra persona te escribió y aún no aceptas. */
  esSolicitud: boolean;
  soySolicitante: boolean;
  ultimoMensaje?: string;
  ultimoMensajeEn?: string;
  motivoReporte?: string;
  mensajes?: MensajeChat[];
}
