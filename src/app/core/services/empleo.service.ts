import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BusquedaEmpleo } from '../models/empleo.model';

@Injectable({ providedIn: 'root' })
export class EmpleoService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/empleo`;

  buscar(termino: string, ciudad?: string, modalidad?: string): Observable<BusquedaEmpleo> {
    return this.http.post<BusquedaEmpleo>(`${this.base}/buscar`, { termino, ciudad, modalidad });
  }

  ultima(): Observable<BusquedaEmpleo | null> {
    return this.http.get<BusquedaEmpleo>(`${this.base}/ultima`).pipe(catchError(() => of(null)));
  }

  historial(): Observable<BusquedaEmpleo[]> {
    return this.http.get<BusquedaEmpleo[]>(`${this.base}/historial`).pipe(catchError(() => of([])));
  }

  borrar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
