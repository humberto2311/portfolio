import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PersonaAudiencia } from '../models/privacidad.model';

@Injectable({ providedIn: 'root' })
export class AudienciaService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/audiencia`;

  readonly mejoresAmigos = signal<PersonaAudiencia[]>([]);
  readonly restringidos = signal<PersonaAudiencia[]>([]);

  cargarMejoresAmigos(): Observable<PersonaAudiencia[]> {
    return this.http.get<PersonaAudiencia[]>(`${this.base}/mejores-amigos`)
      .pipe(tap((lista) => this.mejoresAmigos.set(lista)));
  }

  agregarMejorAmigo(usuarioId: string): Observable<PersonaAudiencia> {
    return this.http.post<PersonaAudiencia>(`${this.base}/mejores-amigos/${usuarioId}`, {})
      .pipe(tap((persona) => this.mejoresAmigos.update((lista) => [persona, ...lista])));
  }

  quitarMejorAmigo(usuarioId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/mejores-amigos/${usuarioId}`)
      .pipe(tap(() => this.mejoresAmigos.update((lista) => lista.filter((p) => p.usuarioId !== usuarioId))));
  }

  cargarRestringidos(): Observable<PersonaAudiencia[]> {
    return this.http.get<PersonaAudiencia[]>(`${this.base}/restringidos`)
      .pipe(tap((lista) => this.restringidos.set(lista)));
  }

  restringir(usuarioId: string): Observable<PersonaAudiencia> {
    return this.http.post<PersonaAudiencia>(`${this.base}/restricciones/${usuarioId}`, {})
      .pipe(tap((persona) => this.restringidos.update((lista) => [persona, ...lista])));
  }

  quitarRestriccion(usuarioId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/restricciones/${usuarioId}`)
      .pipe(tap(() => this.restringidos.update((lista) => lista.filter((p) => p.usuarioId !== usuarioId))));
  }

  bloquear(usuarioId: string, alcance: string): Observable<unknown> {
    return this.http.post(`${this.base}/bloqueos/${usuarioId}?alcance=${alcance}`, {});
  }

  relacion(usuarioId: string): Observable<{ bloqueado: boolean; bloqueaMe: boolean; restringido: boolean; mejorAmigo: boolean }> {
    return this.http.get<{ bloqueado: boolean; bloqueaMe: boolean; restringido: boolean; mejorAmigo: boolean }>(
      `${this.base}/relacion/${usuarioId}`);
  }
}
