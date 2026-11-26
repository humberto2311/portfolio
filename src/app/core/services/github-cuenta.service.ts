import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EstadoGitHub {
  conectada: boolean;
  login: string | null;
  motivo: string | null;
}

@Injectable({ providedIn: 'root' })
export class GitHubCuentaService {

  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/api/bots/github`;

  readonly estado = signal<EstadoGitHub>({ conectada: false, login: null, motivo: null });

  cargar(): Observable<EstadoGitHub> {
    return this.http.get<EstadoGitHub>(this.API).pipe(tap((e) => this.estado.set(e)));
  }

  conectar(token: string): Observable<EstadoGitHub> {
    return this.http.post<EstadoGitHub>(this.API, { token }).pipe(tap((e) => this.estado.set(e)));
  }

  desconectar(): Observable<void> {
    return this.http.delete<void>(this.API).pipe(
      tap(() => this.estado.set({ conectada: false, login: null, motivo: null })));
  }
}
