import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ConexionDto } from '../models/perfil.model';

@Injectable({ providedIn: 'root' })
export class ConnectionService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/api/users/connections`;

  // ==========================================
  // ACCIONES PRIVADAS (Para el usuario logueado)
  // ==========================================

  // GET: a quién sigue el usuario logueado (para sugerencias @)
  getMyFollowing(): Observable<ConexionDto[]> {
    return this.http.get<ConexionDto[]>(`${this.API_URL}/me/following`);
  }

  // GET: quiénes siguen al usuario logueado (para sugerencias @)
  getMyFollowers(): Observable<ConexionDto[]> {
    return this.http.get<ConexionDto[]>(`${this.API_URL}/me/followers`);
  }

  // POST: Seguir a un usuario
  followUser(contactId: string): Observable<any> {
    return this.http.post(`${this.API_URL}/me/follow/${contactId}`, {});
  }

  // DELETE: Dejar de seguir
  unfollowUser(contactId: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/me/unfollow/${contactId}`);
  }

  // GET: Verificar si ya lo sigue
  checkFollowing(contactId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.API_URL}/me/check/${contactId}`);
  }

  // ==========================================
  // CONSULTAS PÚBLICAS (Para ver perfiles de otros)
  // ==========================================

  // GET: Obtener a quién sigue un usuario en específico
  getFollowingByUser(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/${userId}/following`);
  }

  // GET: Obtener los seguidores de un usuario en específico
  getFollowersByUser(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/${userId}/followers`);
  }
}