import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError, throwError } from 'rxjs';
import { PerfilData, Publicacion } from '../models/perfil.model';
import { AuthService } from './auth.service';
// 👇 1. Importamos el environment
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PerfilService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  // 👇 2. Usamos la URL del environment
  private readonly API_URL = `${environment.apiUrl}/api/users`;

  // ==== SIGNALS DE ESTADO ====
  perfil = signal<PerfilData | null>(null);
  publicaciones = signal<Publicacion[]>([]);
  cargando = signal<boolean>(false);

  // ==== CARGA DEL PERFIL ====
  cargarPerfil(username?: string | null): Observable<PerfilData | null> {
    this.cargando.set(true);
    this.perfil.set(null);

    // 👇 3. Lógica para buscar por username o por /me
    const url = username 
      ? `${this.API_URL}/perfil-completo/username/${username}` 
      : `${this.API_URL}/me/perfil-completo`;

    console.log('🔍 [PERFIL SERVICE] Llamando a la URL:', url);

    return this.http.get<any>(url).pipe(
      tap((data: any) => {
        console.log('✅ [PERFIL SERVICE] Datos recibidos:', data);
        if (data) {
          this.perfil.set(this.mapearPerfil(data));
        }
        this.cargando.set(false);
      }),
      catchError((err) => {
        console.error('❌ [PERFIL SERVICE] Error:', err.status, err.message);
        this.cargando.set(false);
        // 👇 Propagamos el error al componente
        return throwError(() => err);
      })
    );
  }

  private mapearPerfil(data: any): PerfilData {
    return {
      id: data.id || '',
      nombre: data.fullName || 'Sin nombre',
      rol: data.role || data.headline || 'Desarrollador',
      estado: data.state || 'DISPONIBLE',
      iniciales: this.generarIniciales(data.fullName || '?'),
      bio: data.shortBio || 'Sin biografía.',
      contacto: {
        email: data.email || '',
        ubicacion: data.ubicacion || '',
        github: data.gitUsername ? `github.com/${data.gitUsername}` : ''
      },
      // 👇 Blindamos las listas para que nunca sean undefined
      experiencia: Array.isArray(data.experiencia) ? data.experiencia : [],
      estudios: Array.isArray(data.estudios) ? data.estudios : [],
      pilaTecnologica: Array.isArray(data.pilaTecnologica) ? data.pilaTecnologica : [],
      proyectos: [], 
      fotos: Array.isArray(data.fotos) ? data.fotos : [],
      contactos: Array.isArray(data.contactos) ? data.contactos : [],
      coverUrl: data.coverUrl || undefined,
      avatarUrl: data.avatarUrl || undefined
    };
  }

  private generarIniciales(nombre: string): string {
    if (!nombre) return '?';
    const partes = nombre.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  }

  // ==== PUBLICACIONES ====
  cargarPublicaciones(): Observable<Publicacion[]> {
    this.publicaciones.set([]); 
    return of([]);
  }

  crearPublicacion(texto: string, imagen?: string): void {
    const user = this.authService.currentUser();
    const nueva: Publicacion = {
      id: Date.now(),
      autor: user?.fullName || 'Usuario',
      iniciales: this.generarIniciales(user?.fullName || 'U'),
      tiempo: 'Hace un momento',
      texto,
      imagen,
      likes: 0,
      compartidos: 0,
      comentarios: []
    };
    this.publicaciones.update(list => [nueva, ...list]);
  }

  toggleLike(postId: number): void {
    this.publicaciones.update(list =>
      list.map(p => p.id === postId ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p)
    );
  }

  agregarComentario(postId: number, texto: string): void {
    const user = this.authService.currentUser();
    const iniciales = this.generarIniciales(user?.fullName || 'U');
    this.publicaciones.update(list =>
      list.map(p => p.id === postId ? {
        ...p, comentarios: [...p.comentarios, { id: Date.now(), autor: user?.fullName || 'Usuario', iniciales, texto }]
      } : p)
    );
  }
}