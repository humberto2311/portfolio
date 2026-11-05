import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TalentoBuscado } from '../models/talento.model';

@Injectable({ providedIn: 'root' })
export class TalentoService {
  private http = inject(HttpClient);

  private readonly base = `${environment.apiUrl}/api/talento`;

  /** El backend exige al menos un filtro: sin skill ni rol no devuelve la lista completa. */
  buscar(skill: string, rol: string, limite = 20): Observable<TalentoBuscado[]> {
    let params = new HttpParams().set('limite', limite);
    if (skill.trim()) params = params.set('skill', skill.trim());
    if (rol.trim()) params = params.set('rol', rol.trim());

    return this.http
      .get<TalentoBuscado[]>(this.base, { params })
      .pipe(catchError(() => of([] as TalentoBuscado[])));
  }
}
