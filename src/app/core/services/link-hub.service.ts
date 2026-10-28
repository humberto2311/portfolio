import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LinkItem, LinkItemPayload } from '../models/LinkItem';

@Injectable({ providedIn: 'root' })
export class LinkHubService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/links'; // ajusta a tu endpoint real

  getAll(): Observable<LinkItem[]> {
    return this.http.get<LinkItem[]>(this.baseUrl);
  }

  getById(id: string): Observable<LinkItem> {
    return this.http.get<LinkItem>(`${this.baseUrl}/${id}`);
  }

  create(payload: LinkItemPayload): Observable<LinkItem> {
    return this.http.post<LinkItem>(this.baseUrl, payload);
  }

  update(id: string, payload: LinkItemPayload): Observable<LinkItem> {
    return this.http.put<LinkItem>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
  setActive(id: string): Observable<LinkItem> {
    return this.http.patch<LinkItem>(`${this.baseUrl}/${id}/active`, { active: true });
  }
}