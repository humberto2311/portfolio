import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AuditoriaComando,
  BotComando,
  CatalogoComandos,
  RespuestaComando
} from '../models/comando.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ComandosService {

  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/api/comandos`;

  getGuia(): Observable<CatalogoComandos> {
    return this.http.get<CatalogoComandos>(`${this.API}/guia`);
  }

  enviarMensaje(mensaje: string, conversacionId: string | null): Observable<RespuestaComando> {
    return this.http.post<RespuestaComando>(`${this.API}/mensaje`, { mensaje, conversacionId });
  }

  confirmar(conversacionId: string | null): Observable<RespuestaComando> {
    return this.http.post<RespuestaComando>(`${this.API}/confirmar`, { conversacionId });
  }

  cancelar(conversacionId: string | null): Observable<RespuestaComando> {
    return this.http.post<RespuestaComando>(`${this.API}/cancelar`, { conversacionId });
  }

  pedirAyuda(consulta: string, conversacionId: string | null): Observable<RespuestaComando> {
    return this.http.post<RespuestaComando>(`${this.API}/ayuda`, { consulta, conversacionId });
  }

  getBots(conversacionId: string | null): Observable<BotComando[]> {
    const query = conversacionId ? `?conversacionId=${conversacionId}` : '';
    return this.http.get<BotComando[]>(`${this.API}/bots${query}`);
  }

  cambiarBot(bot: string, activo: boolean, conversacionId: string | null): Observable<BotComando> {
    return this.http.put<BotComando>(`${this.API}/bots`, { bot, activo, conversacionId });
  }

  cambiarModoIa(activo: boolean, conversacionId: string | null): Observable<{ activo: boolean }> {
    return this.http.put<{ activo: boolean }>(`${this.API}/modo-ia`, { activo, conversacionId });
  }

  getAuditoria(): Observable<AuditoriaComando[]> {
    return this.http.get<AuditoriaComando[]>(`${this.API}/auditoria`);
  }
}
