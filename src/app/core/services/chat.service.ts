import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  Conversacion, 
  ChatMessageApi, 
  ChatMessageSendApi, 
  ChatMessageUpdateApi 
} from '../models/chat.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  
  private baseChats = `${environment.apiUrl}/api/chats`;
  private baseMessages = `${environment.apiUrl}/api/chat`;

  
  listar(): Observable<Conversacion[]> {
    return this.http.get<Conversacion[]>(this.baseChats);
  }

  abrir(id: string): Observable<Conversacion> {
    return this.http.get<Conversacion>(`${this.baseChats}/${id}`);
  }

  enviar(destinatarioId: string, contenido: string): Observable<Conversacion> {
    return this.http.post<Conversacion>(this.baseChats, { destinatarioId, contenido });
  }

  responder(id: string, contenido: string): Observable<Conversacion> {
    return this.http.post<Conversacion>(`${this.baseChats}/${id}/mensajes`, { contenido });
  }

  aceptar(id: string): Observable<Conversacion> {
    return this.http.post<Conversacion>(`${this.baseChats}/${id}/aceptar`, {});
  }

  rechazar(id: string): Observable<Conversacion> {
    return this.http.post<Conversacion>(`${this.baseChats}/${id}/rechazar`, {});
  }

  reportar(id: string, motivo: string): Observable<Conversacion> {
    return this.http.post<Conversacion>(`${this.baseChats}/${id}/reportar`, { motivo });
  }

  eliminarConversacion(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseChats}/${id}`);
  }

 
  sendMessage(payload: ChatMessageSendApi): Observable<ChatMessageApi> {
    return this.http.post<ChatMessageApi>(this.baseMessages, payload);
  }

  updateMessage(id: string, payload: ChatMessageUpdateApi): Observable<ChatMessageApi> {
    return this.http.put<ChatMessageApi>(`${this.baseMessages}/${id}`, payload);
  }

  deleteMessage(id: string): Observable<ChatMessageApi> {
    return this.http.delete<ChatMessageApi>(`${this.baseMessages}/${id}`);
  }

  getBySession(sessionId: string): Observable<ChatMessageApi[]> {
    return this.http.get<ChatMessageApi[]>(`${this.baseMessages}/session/${sessionId}`);
  }

  getConversation(senderId: string, receiverId: string): Observable<ChatMessageApi[]> {
    const params = new HttpParams()
      .set('senderId', senderId)
      .set('receiverId', receiverId);
    return this.http.get<ChatMessageApi[]>(`${this.baseMessages}/conversation`, { params });
  }
}