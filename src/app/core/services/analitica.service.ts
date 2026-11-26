import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AnaliticaPanel, FilaSeguimiento, HojaExportacion } from '../models/analitica.model';

@Injectable({
  providedIn: 'root'
})
export class AnaliticaService {

  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/api/analitica`;

  panel(empresaId: string | null, desde?: string, hasta?: string): Observable<AnaliticaPanel> {
    return this.http.get<AnaliticaPanel>(`${this.API}/panel`, { params: this.params(empresaId, desde, hasta) });
  }

  exportarContactos(empresaId: string | null, desde?: string, hasta?: string): Observable<HojaExportacion> {
    return this.http.get<HojaExportacion>(`${this.API}/exportar/contactos`, {
      params: this.params(empresaId, desde, hasta)
    });
  }

  exportarEventos(empresaId: string | null, desde?: string, hasta?: string): Observable<HojaExportacion> {
    return this.http.get<HojaExportacion>(`${this.API}/exportar/eventos`, {
      params: this.params(empresaId, desde, hasta)
    });
  }

  registrarAccion(tipo: string, eventoId: string | null, contactoId: string | null, empresaId: string | null): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/api/networking/acciones`, {
      tipo, eventoId, contactoId, empresaId
    });
  }

  seguimiento(): Observable<{ filas: FilaSeguimiento[] }> {
    return this.http.get<{ filas: FilaSeguimiento[] }>(`${environment.apiUrl}/api/analitica/seguimiento`);
  }

  guardarSeguimiento(contactoId: string, estado: string, nota?: string | null,
                     recordarEn?: string | null): Observable<FilaSeguimiento> {
    return this.http.post<FilaSeguimiento>(
      `${environment.apiUrl}/api/analitica/seguimiento/${contactoId}`,
      { estado, nota: nota ?? null, recordarEn: recordarEn ?? null }
    );
  }

  registrarClic(enlace: string, empresaId: string | null): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/api/eventos/clic`, { enlace, empresaId });
  }

  private params(empresaId: string | null, desde?: string, hasta?: string): HttpParams {
    let params = new HttpParams();
    if (empresaId) params = params.set('empresaId', empresaId);
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return params;
  }
}
