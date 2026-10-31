import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ShareDto, Page } from '../models/perfil.model';

@Injectable({ providedIn: 'root' })
export class ShareService {
  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/api/shares`;

  /** Solicitudes pendientes del usuario logueado (compartida entre navbar y panel). */
  readonly pendientes = signal<ShareDto[]>([]);

  share(postId: string, targetProfileId: string, message?: string): Observable<ShareDto> {
    let params = new HttpParams().set('targetProfileId', targetProfileId);
    if (message) params = params.set('message', message);

    return this.http.post<ShareDto>(
      `${this.API}/post/${postId}`,
      {},
      { params }
    );
  }

  resolve(shareId: string, accept: boolean): Observable<ShareDto> {
    const params = new HttpParams().set('accept', accept);
    return this.http.post<ShareDto>(
      `${this.API}/${shareId}/resolve`,
      {},
      { params }
    );
  }

  /** Edita la descripción del compartido; con null la borra. */
  actualizarMensaje(shareId: string, message: string | null): Observable<ShareDto> {
    return this.http.put<ShareDto>(`${this.API}/${shareId}/message`, { message });
  }

  pending(page = 0, size = 10): Observable<Page<ShareDto>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<ShareDto>>(`${this.API}/pending`, { params });
  }

  /** Refresca el contador y la lista de solicitudes. */
  cargarPendientes(page = 0, size = 20): void {
    this.pending(page, size).subscribe({
      next: (res) => this.pendientes.set(res?.content ?? []),
      error: () => this.pendientes.set([]),
    });
  }

  /** Acepta o rechaza y quita la solicitud de la lista. */
  resolverSolicitud(shareId: string, accept: boolean): Observable<ShareDto> {
    return this.resolve(shareId, accept).pipe(
      tap(() =>
        this.pendientes.update((lista) =>
          lista.filter((s) => String(s.id) !== String(shareId))
        )
      )
    );
  }
}
