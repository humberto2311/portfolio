export interface ChatMessage {
  sender: 'me' | 'them';
  text: string;
  time: string;
  id?: string;
  createdAt?: string;
  edited?: boolean;
}

export interface ChatMessageApi {
  id: string;
  sessionId: string;
  senderId: string;
  senderName: string;
  receiverId: string | null;
  content: string;
  createdAt: string;
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