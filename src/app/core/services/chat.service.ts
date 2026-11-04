import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Conversacion } from '../models/chat.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/chats`;

  listar(): Observable<Conversacion[]> {
    return this.http.get<Conversacion[]>(this.base);
  }

  abrir(id: string): Observable<Conversacion> {
    return this.http.get<Conversacion>(`${this.base}/${id}`);
  }

  /** Inicia o continúa una conversación con alguien. */
  enviar(destinatarioId: string, contenido: string): Observable<Conversacion> {
    return this.http.post<Conversacion>(this.base, { destinatarioId, contenido });
  }

  /** Responde dentro de una conversación existente. */
  responder(id: string, contenido: string): Observable<Conversacion> {
    return this.http.post<Conversacion>(`${this.base}/${id}/mensajes`, { contenido });
  }

  aceptar(id: string): Observable<Conversacion> {
    return this.http.post<Conversacion>(`${this.base}/${id}/aceptar`, {});
  }

  rechazar(id: string): Observable<Conversacion> {
    return this.http.post<Conversacion>(`${this.base}/${id}/rechazar`, {});
  }

  reportar(id: string, motivo: string): Observable<Conversacion> {
    return this.http.post<Conversacion>(`${this.base}/${id}/reportar`, { motivo });
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
