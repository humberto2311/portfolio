import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CoachPeticion, CoachRespuesta } from '../models/coach-cv.model';

/**
 * Chat de mejora de hoja de vida de la pantalla de empleo.
 * El backend ya conoce el CV y las estadísticas del usuario; aquí solo viajan
 * las preguntas y las vacantes que tiene abiertas en pantalla.
 */
@Injectable({ providedIn: 'root' })
export class CoachCvService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/empleo/coach`;

  conversar(peticion: CoachPeticion): Observable<CoachRespuesta> {
    return this.http.post<CoachRespuesta>(`${this.base}/chat`, peticion);
  }
}
