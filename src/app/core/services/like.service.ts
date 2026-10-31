// core/services/social/like.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LikeToggleResponse } from '../models/perfil.model';

@Injectable({ providedIn: 'root' })
export class LikeService {
  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/api/posts`;


  toggle(postId: string): Observable<LikeToggleResponse> {
    return this.http.post<LikeToggleResponse>(
      `${this.API}/${postId}/likes`,
      {}
    );
  }

  /** Solo el contador */
  count(postId: string): Observable<number> {
    return this.http.get<number>(`${this.API}/${postId}/likes/count`);
  }
}