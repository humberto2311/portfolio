import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PostDto,
  Page,
  CreatePostRequest,
} from '../models/perfil.model';


@Injectable({ providedIn: 'root' })
export class PostService {
  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/api/posts`;

  /** Feed de un perfil con paginación */
  feed(profileId: string, page = 0, size = 10): Observable<Page<PostDto>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size);
    return this.http.get<Page<PostDto>>(
      `${this.API}/feed/${profileId}`,
      { params }
    );
  }

  /** Crear publicación */
  create(req: CreatePostRequest): Observable<PostDto> {
    return this.http.post<PostDto>(this.API, req);
  }

  /** Obtener post por id */
  findById(id: string): Observable<PostDto> {
    return this.http.get<PostDto>(`${this.API}/${id}`);
  }

  /** Actualizar contenido */
  update(id: string, content: string): Observable<PostDto> {
    return this.http.put<PostDto>(`${this.API}/${id}`, { content });
  }

  /** Eliminar post */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }
}