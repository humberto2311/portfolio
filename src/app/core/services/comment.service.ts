import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CommentDto, Page } from '../models/perfil.model';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/api/posts`;

  list(postId: string, page = 0, size = 20): Observable<Page<CommentDto>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<CommentDto>>(
      `${this.API}/${postId}/comments`,
      { params }
    );
  }

  create(postId: string, content: string): Observable<CommentDto> {
    return this.http.post<CommentDto>(
      `${this.API}/${postId}/comments`,
      { content }
    );
  }

  update(postId: string, commentId: string, content: string): Observable<CommentDto> {
    return this.http.put<CommentDto>(
      `${this.API}/${postId}/comments/${commentId}`,
      { content }
    );
  }

  delete(postId: string, commentId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.API}/${postId}/comments/${commentId}`
    );
  }
}