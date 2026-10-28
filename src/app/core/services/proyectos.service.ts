import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Proyecto } from '../models/proyecto';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProyectosService {

  private http = inject(HttpClient);
  private readonly API_CARDS = `${environment.apiUrl}/api/cards`;
  private readonly API_GITHUB = `${environment.apiUrl}/api/github`;

  getProyectos(): Observable<Proyecto[]> {
    return this.http.get<Proyecto[]>(this.API_CARDS);
  }

  getPublicProyectos(): Observable<Proyecto[]> {
    return this.http.get<Proyecto[]>(`${this.API_CARDS}/public`);
  }

  getProyectosDeUsuario(username: string): Observable<Proyecto[]> {
    return this.http.get<Proyecto[]>(`${this.API_CARDS}/usuario/${username}`);
  }

  updateProyecto(id: number, dto: Partial<Proyecto>): Observable<Proyecto> {
    return this.http.put<Proyecto>(`${this.API_CARDS}/${id}`, dto);
  }

  deleteProyecto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_CARDS}/${id}`);
  }

  importAllFromUser(gitUsername: string): Observable<Proyecto[]> {
    return this.http.post<Proyecto[]>(`${this.API_GITHUB}/import-user/${gitUsername}`, {});
  }

  toggleVisibility(id: number): Observable<Proyecto> {
    return this.http.patch<Proyecto>(`${this.API_CARDS}/${id}/visibility`, {});
  }

  buscarReposPublicosDeUsuario(username: string): Observable<Proyecto[]> {
    return this.http.get<Proyecto[]>(`${this.API_GITHUB}/user/${username}/repos`);
  }
}