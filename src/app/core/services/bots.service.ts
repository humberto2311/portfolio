import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Bot {
  id: string;
  nombre: string;
  descripcion?: string;
  instrucciones?: string;
  activo?: boolean;
  creadoEn?: string;
}

export interface HerramientaBot {
  id?: string;
  herramientaNombre: string;
  habilitada: boolean;
  cuenta?: string;
}

export interface MensajeBot {
  id?: string;
  rol: 'usuario' | 'bot';
  contenido: string;
  comando?: string;
  estado?: string;
  creadoEn?: string;
}

export interface EstadoGoogle {
  disponible: boolean;
  conectado: boolean;
  cuenta?: string;
  motivo?: string;
}

@Injectable({ providedIn: 'root' })
export class BotsService {

  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/api/bots`;

  listar(): Observable<Bot[]> {
    return this.http.get<Bot[]>(this.API);
  }

  obtener(id: string): Observable<Bot> {
    return this.http.get<Bot>(`${this.API}/${id}`);
  }

  crear(bot: Partial<Bot>): Observable<Bot> {
    return this.http.post<Bot>(this.API, bot);
  }

  editar(id: string, bot: Partial<Bot>): Observable<Bot> {
    return this.http.put<Bot>(`${this.API}/${id}`, bot);
  }

  borrar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  mensajes(id: string): Observable<MensajeBot[]> {
    return this.http.get<MensajeBot[]>(`${this.API}/${id}/mensajes`);
  }

  conversar(id: string, mensaje: string): Observable<MensajeBot[]> {
    return this.http.post<MensajeBot[]>(`${this.API}/${id}/mensajes`, { mensaje });
  }

  herramientas(id: string): Observable<HerramientaBot[]> {
    return this.http.get<HerramientaBot[]>(`${this.API}/${id}/herramientas`);
  }

  activarHerramienta(id: string, nombre: string, habilitada: boolean): Observable<HerramientaBot> {
    return this.http.put<HerramientaBot>(`${this.API}/${id}/herramientas/${nombre}`, { habilitada });
  }

  estadoGoogle(id: string): Observable<EstadoGoogle> {
    return this.http.get<EstadoGoogle>(`${this.API}/google/${id}/estado`);
  }

  urlGoogle(id: string): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.API}/google/${id}/autorizar`);
  }

  desconectarGoogle(id: string): Observable<Record<string, string>> {
    return this.http.post<Record<string, string>>(`${this.API}/google/${id}/desconectar`, {});
  }
}
