import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type TipoProgramacion = 'UNA_VEZ' | 'DIARIO' | 'SEMANAL' | 'MENSUAL';

export interface ProgramarMensaje {
  destinatarioId: string;
  contenido: string;
  tipo: TipoProgramacion;
  minutos?: number;
  fecha?: string;
  hora?: string;
  diaSemana?: number;
  diaMes?: number;
}

export interface MensajeProgramado {
  id: string;
  destinatarioId: string;
  destinatarioNombre: string;
  contenido: string;
  tipo: TipoProgramacion;
  etiqueta: string;
  proximoEnvio: string;
  hora: string;
  diaSemana?: number;
  diaMes?: number;
  activo: boolean;
  enviado: boolean;
  ultimoEnvio?: string;
  creadoEn: string;
}

@Injectable({ providedIn: 'root' })
export class MensajesProgramadosService {
  private readonly http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/api/mensajes-programados`;

  listar(): Observable<MensajeProgramado[]> {
    return this.http.get<MensajeProgramado[]>(this.API);
  }

  programar(datos: ProgramarMensaje): Observable<MensajeProgramado> {
    return this.http.post<MensajeProgramado>(this.API, datos);
  }

  pausar(id: string, activo: boolean): Observable<MensajeProgramado> {
    return this.http.patch<MensajeProgramado>(`${this.API}/${id}?activo=${activo}`, {});
  }

  cancelar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }
}
