import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PostTagDto } from '../models/perfil.model';

@Injectable({ providedIn: 'root' })
export class PostTagService {
  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/api/posts`;

  add(postId: string, taggedUserId: string): Observable<PostTagDto> {
    return this.http.post<PostTagDto>(
      `${this.API}/${postId}/tags/${taggedUserId}`,
      {}
    );
  }

  findByPost(postId: string): Observable<PostTagDto[]> {
    return this.http.get<PostTagDto[]>(`${this.API}/${postId}/tags`);
  }

  remove(postId: string, taggedUserId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.API}/${postId}/tags/${taggedUserId}`
    );
  }
}