import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EstadoSpotify, PistaSpotify } from '../models/spotify.model';
import { environment } from '../../../environments/environment';

export type ErrorSpotifyTipo =
  | 'sin-cuenta'
  | 'sin-premium'
  | 'sin-dispositivo'
  | 'token'
  | 'sin-configurar'
  | 'remoto'
  | 'general';

export interface ErrorSpotify {
  tipo: ErrorSpotifyTipo;
  mensaje: string;
}

@Injectable({
  providedIn: 'root'
})
export class SpotifyService {

  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/api/spotify`;

  getUrlConexion(redirect?: string): Observable<{ url: string }> {
    const destino = redirect ? `?redirect=${encodeURIComponent(redirect)}` : '';
    return this.http.get<{ url: string }>(`${this.API}/connect${destino}`);
  }

  conectar(codigo: string, redirect?: string): Observable<{ estado: string }> {
    const destino = redirect ? `&redirect=${encodeURIComponent(redirect)}` : '';
    return this.http.get<{ estado: string }>(`${this.API}/callback?code=${encodeURIComponent(codigo)}${destino}`);
  }

  desconectar(): Observable<void> {
    return this.http.post<void>(`${this.API}/disconnect`, {});
  }

  getEstadoActual(): Observable<EstadoSpotify> {
    return this.http.get<EstadoSpotify>(`${this.API}/current`);
  }

  getEstadoPublico(username: string): Observable<EstadoSpotify> {
    return this.http.get<EstadoSpotify>(`${this.API}/public/current?usuario=${encodeURIComponent(username)}`);
  }

  reproducir(): Observable<void> {
    return this.http.put<void>(`${this.API}/play`, {});
  }

  pausar(): Observable<void> {
    return this.http.put<void>(`${this.API}/pause`, {});
  }

  siguiente(): Observable<void> {
    return this.http.post<void>(`${this.API}/next`, {});
  }

  anterior(): Observable<void> {
    return this.http.post<void>(`${this.API}/previous`, {});
  }

  buscar(consulta: string, limite = 10): Observable<PistaSpotify[]> {
    return this.http.get<PistaSpotify[]>(`${this.API}/search`, {
      params: { q: consulta, limite }
    });
  }

  reproducirPista(uri: string): Observable<void> {
    return this.http.post<void>(`${this.API}/play-track`, { uri });
  }

  comoError(error: unknown): ErrorSpotify {
    if (error instanceof HttpErrorResponse) {
      const cuerpo = error.error as { error?: string; tipo?: string } | null;
      const tipo = (cuerpo?.tipo as ErrorSpotifyTipo) ?? this.tipoPorEstado(error.status);

      return {
        tipo,
        mensaje: cuerpo?.error ?? this.mensajePorEstado(error.status)
      };
    }

    return { tipo: 'general', mensaje: 'No se pudo hablar con Spotify. Inténtalo de nuevo.' };
  }

  private tipoPorEstado(status: number): ErrorSpotifyTipo {
    switch (status) {
      case 428:
        return 'sin-cuenta';
      case 403:
        return 'sin-premium';
      case 409:
        return 'sin-dispositivo';
      case 401:
        return 'token';
      case 503:
        return 'sin-configurar';
      default:
        return 'remoto';
    }
  }

  private mensajePorEstado(status: number): string {
    switch (status) {
      case 428:
        return 'Conecta tu cuenta de Spotify para usar el reproductor.';
      case 403:
        return 'Controlar la reproducción necesita Spotify Premium.';
      case 409:
        return 'Abre Spotify en tu teléfono o computadora: no hay ningún dispositivo activo.';
      case 401:
        return 'La sesión de Spotify caducó. Vuelve a conectar tu cuenta.';
      case 503:
        return 'Spotify no está configurado en el servidor.';
      default:
        return 'Spotify no respondió como se esperaba.';
    }
  }
}
