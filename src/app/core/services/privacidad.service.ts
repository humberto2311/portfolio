import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AlcanceBloqueo, Bloqueo, Presencia, Privacidad } from '../models/privacidad.model';

@Injectable({ providedIn: 'root' })
export class PrivacidadService {

  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/privacidad`;

  readonly ajustes = signal<Privacidad | null>(null);

  cargar(): Observable<Privacidad> {
    return this.http.get<Privacidad>(this.base).pipe(tap((datos) => this.ajustes.set(datos)));
  }

  guardar(cambios: Partial<Privacidad>): Observable<Privacidad> {
    return this.http.put<Privacidad>(this.base, cambios).pipe(tap((datos) => this.ajustes.set(datos)));
  }

  bloquear(usuarioId: string, alcance: AlcanceBloqueo = 'TODO'): Observable<Bloqueo> {
    return this.http.post<Bloqueo>(`${this.base}/bloqueos/${usuarioId}`, { alcance });
  }

  presenciaDe(usuarioId: string): Observable<Presencia> {
    return this.http.get<Presencia>(`${environment.apiUrl}/api/privacidad/presencia/${usuarioId}`);
  }

  desbloquear(usuarioId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/bloqueos/${usuarioId}`);
  }
}
