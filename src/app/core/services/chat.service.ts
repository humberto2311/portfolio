import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Conversacion,
  ChatMessageApi,
  ChatMessageUpdateApi,
  UsuarioBuscado,
  ChatEmpresa,
  MensajeEmpresa,
} from '../models/chat.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  
  private readonly baseChats = `${environment.apiUrl}/api/chats`;
  private readonly baseEmpresas = `${environment.apiUrl}/api/empresas`;
  private readonly baseUsers = `${environment.apiUrl}/api/users`;

  
  misChatsDeEmpresa(empresaId: string): Observable<ChatEmpresa[]> {
    return this.http.get<ChatEmpresa[]>(`${this.baseEmpresas}/${empresaId}/chat/mis`);
  }

  bandejaEmpresa(empresaId: string): Observable<ChatEmpresa[]> {
    return this.http.get<ChatEmpresa[]>(`${this.baseEmpresas}/${empresaId}/chat`);
  }

  abrirChatEmpresa(empresaId: string): Observable<ChatEmpresa> {
    return this.http.post<ChatEmpresa>(`${this.baseEmpresas}/${empresaId}/chat/empresa`, {});
  }

  abrirGrupoEmpresa(empresaId: string): Observable<ChatEmpresa> {
    return this.http.post<ChatEmpresa>(`${this.baseEmpresas}/${empresaId}/chat/grupo`, {});
  }

  mensajesEmpresa(empresaId: string, conversacionId: string): Observable<MensajeEmpresa[]> {
    return this.http.get<MensajeEmpresa[]>(
      `${this.baseEmpresas}/${empresaId}/chat/${conversacionId}/mensajes`,
    );
  }

  enviarEmpresa(empresaId: string, conversacionId: string, contenido: string): Observable<MensajeEmpresa> {
    return this.http.post<MensajeEmpresa>(
      `${this.baseEmpresas}/${empresaId}/chat/${conversacionId}/mensajes`,
      { contenido },
    );
  }

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

 
  /** Editar mensaje propio (ventana de 1 hora en el backend). */
  editarMensaje(mensajeId: string, payload: ChatMessageUpdateApi): Observable<ChatMessageApi> {
    return this.http.patch<ChatMessageApi>(`${this.baseChats}/mensajes/${mensajeId}`, payload);
  }

  /** Borrado lógico de un mensaje propio. */
  borrarMensaje(mensajeId: string): Observable<ChatMessageApi> {
    return this.http.delete<ChatMessageApi>(`${this.baseChats}/mensajes/${mensajeId}`);
  }

  /** Personas cuyo nombre contiene el término; sirve para abrir un chat nuevo. */
  buscarUsuarios(termino: string): Observable<UsuarioBuscado[]> {
    const params = new HttpParams().set('q', termino.trim());
    return this.http.get<UsuarioBuscado[]>(`${this.baseUsers}/search`, { params });
  }
}