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

export interface ChatMessageUpdateApi {
  content: string;
}

/** Respuesta de /api/users/search */
export interface UsuarioBuscado {
  id: string;
  fullName: string;
  gitUsername?: string | null;
  avatarUrl?: string | null;
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

export interface ChatEmpresa {
  id: string;
  empresaId?: string | null;
  tipo: 'PERSONAL' | 'EMPRESA_CLIENTE' | 'EMPRESA_GRUPO';
  etiqueta: 'Personal' | 'Empresarial' | 'Grupal';
  titulo: string;
  subtitulo?: string | null;
  usuarioId?: string | null;
  usuarioNombre?: string | null;
  usuarioAvatar?: string | null;
  empresaNombre?: string | null;
  empresaLogoUrl?: string | null;
  ultimoMensaje?: string | null;
  ultimoMensajeEn?: string | null;
  mensajes?: number;
  propio?: boolean;
}

export interface MensajeEmpresa {
  id: string;
  conversacionId: string;
  autorId?: string | null;
  autorNombre?: string | null;
  autorAvatar?: string | null;
  contenido: string;
  creadoEn: string;
  propio?: boolean;
  deEmpresa?: boolean;
}
