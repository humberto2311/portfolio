import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserProfile } from '../models/proyecto';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private readonly API = `${environment.apiUrl}/api/users`;

  private readonly miAvatar = signal<string | null>(null);
  private readonly miPortada = signal<string | null>(null);
  private avatarCargado = false;

    readonly avatar = this.miAvatar.asReadonly();

    readonly portada = this.miPortada.asReadonly();

  getMe(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.API}/me`);
  }

  updateGitUsername(gitUsername: string): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.API}/me/git-username`, { gitUsername });
  }

    updateGitlabUsername(gitlabUsername: string): Observable<{ gitlabUsername?: string }> {
    return this.http.put<{ gitlabUsername?: string }>(
      `${this.API}/me/fuentes/gitlab`, { gitlabUsername });
  }

  getPerfilCompletoPorId(id: string): Observable<any> {
    return this.http.get<any>(`${this.API}/perfil-completo/${id}`);
  }

  getPerfilCompletoPorUsername(username: string): Observable<any> {
    return this.http.get<any>(`${this.API}/perfil-completo/username/${username}`);
  }

    getMiPerfilSocial(): Observable<any> {
    return this.http.get<any>(`${this.API}/social/me`);
  }

    guardarMiPerfilSocial(dto: any): Observable<any> {
    return this.http.post<any>(`${this.API}/social/me`, dto).pipe(
      tap((guardado) => this.aplicarAvatar(guardado))
    );
  }

  usarFotoEnMiPerfil(photoUrl: string, campo: 'avatarUrl' | 'coverUrl'): Observable<any> {
    return this.getMiPerfilSocial().pipe(
      switchMap((social) => this.guardarMiPerfilSocial({ ...(social ?? {}), [campo]: photoUrl }))
    );
  }

    cargarMiAvatar(): void {
    if (this.avatarCargado || !this.auth.isAuthenticated()) return;

    this.avatarCargado = true;
    this.getMiPerfilSocial().subscribe({
      next: (social) => this.aplicarAvatar(social),
      error: () => { this.avatarCargado = false; },
    });
  }

  private aplicarAvatar(social: any): void {
    this.miAvatar.set(social?.avatarUrl?.trim() || null);
    this.miPortada.set(social?.coverUrl?.trim() || null);
  }
}
