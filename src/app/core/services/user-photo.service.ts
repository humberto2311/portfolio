import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CommentDto, LikeToggleResponse, Page } from '../models/perfil.model';

export interface FotoPerfil {
  id: number;
  userId?: string;
  url: string;
  descripcion?: string | null;
  likesCount?: number;
  likedByMe?: boolean;
  commentsCount?: number;
}

/**
 * Fotos que se ponen en el perfil: la portada y el avatar quedan registradas
 * aquí por el backend. Lo que se publica vive en el feed y la galería lo muestra junto a estas.
 */
@Injectable({ providedIn: 'root' })
export class UserPhotoService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/api/users/photos`;

  listar(userId: string): Observable<FotoPerfil[]> {
    return this.http.get<FotoPerfil[]>(`${this.API_URL}/${userId}`);
  }

  borrar(photoId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${photoId}`);
  }

  /** El visor abre fotos por id; la ruta lleva "id/" porque /{userId} ya usa ese tramo. */
  like(photoId: number): Observable<LikeToggleResponse> {
    return this.http.post<LikeToggleResponse>(`${this.API_URL}/id/${photoId}/like`, {});
  }

  cambiarDescripcion(photoId: number, descripcion: string): Observable<FotoPerfil> {
    return this.http.put<FotoPerfil>(`${this.API_URL}/id/${photoId}/descripcion`, { descripcion });
  }

  comentarios(photoId: number, page = 0, size = 20): Observable<Page<CommentDto>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<CommentDto>>(`${this.API_URL}/id/${photoId}/comments`, { params });
  }

  comentar(photoId: number, content: string): Observable<CommentDto> {
    return this.http.post<CommentDto>(`${this.API_URL}/id/${photoId}/comments`, { content });
  }

  editarComentario(photoId: number, commentId: string, content: string): Observable<CommentDto> {
    return this.http.put<CommentDto>(
      `${this.API_URL}/id/${photoId}/comments/${commentId}`,
      { content }
    );
  }

  borrarComentario(photoId: number, commentId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/id/${photoId}/comments/${commentId}`);
  }

  likeComentario(photoId: number, commentId: string): Observable<LikeToggleResponse> {
    return this.http.post<LikeToggleResponse>(
      `${this.API_URL}/id/${photoId}/comments/${commentId}/like`,
      {}
    );
  }

  /**
   * Avatar y portada antiguos no tienen fila en la galería: al abrirlos se pide
   * que el backend la cree (si el dueño es quien abre) para poder likear y comentar.
   */
  asegurar(userId: string, url: string): Observable<FotoPerfil> {
    return this.http.post<FotoPerfil>(`${this.API_URL}/ensure`, { userId, url });
  }
}
