
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ChatMessageApi,
  ChatMessageSendApi,
} from '../models/chat.model';

@Injectable({ providedIn: 'root' })
export class ChatApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api/chat';

  sendMessage(payload: ChatMessageSendApi): Observable<ChatMessageApi> {
    return this.http.post<ChatMessageApi>(this.baseUrl, payload);
  }

  updateMessage(id: string, content: string): Observable<ChatMessageApi> {
    return this.http.put<ChatMessageApi>(`${this.baseUrl}/${id}`, { content });
  }

  getBySession(sessionId: string): Observable<ChatMessageApi[]> {
    return this.http.get<ChatMessageApi[]>(`${this.baseUrl}/session/${sessionId}`);
  }

  getConversation(senderId: string, receiverId: string): Observable<ChatMessageApi[]> {
    const params = new HttpParams()
      .set('senderId', senderId)
      .set('receiverId', receiverId);
    return this.http.get<ChatMessageApi[]>(`${this.baseUrl}/conversation`, { params });
  }

  deleteMessage(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}