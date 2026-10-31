import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserProfile } from '../models/proyecto';

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/api/users`;

  getMe(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.API}/me`);
  }

  updateGitUsername(gitUsername: string): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.API}/me/git-username`, { gitUsername });
  }

  getPerfilCompletoPorId(id: string): Observable<any> {
    return this.http.get<any>(`${this.API}/perfil-completo/${id}`);
  }

  getPerfilCompletoPorUsername(username: string): Observable<any> {
    return this.http.get<any>(`${this.API}/perfil-completo/username/${username}`);
  }

  /** Perfil social propio (rol, estado, portada, bio...). */
  getMiPerfilSocial(): Observable<any> {
    return this.http.get<any>(`${this.API}/social/me`);
  }

  /** Guarda el perfil social propio (rol, estado, portada, bio...). */
  guardarMiPerfilSocial(dto: any): Observable<any> {
    return this.http.post<any>(`${this.API}/social/me`, dto);
  }
}
