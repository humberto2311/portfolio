import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export type TipoSugerencia = 'NUEVO' | 'HERRAMIENTA' | 'MEJORA';

export interface SugerenciaBot {
  id: string;
  tipo: TipoSugerencia;
  nombre: string;
  detalle: string;
  estado: string;
  creadoEn: string;
}

@Injectable({ providedIn: 'root' })
export class SugerenciasBotService {

  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/api/bots/sugerencias`;

  readonly sugerencias = signal<SugerenciaBot[]>([]);

  cargar(): Observable<SugerenciaBot[]> {
    return this.http.get<SugerenciaBot[]>(this.API).pipe(tap((lista) => this.sugerencias.set(lista)));
  }

  crear(tipo: TipoSugerencia, nombre: string, detalle: string): Observable<SugerenciaBot> {
    return this.http.post<SugerenciaBot>(this.API, { tipo, nombre, detalle });
  }

  borrar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }
}
