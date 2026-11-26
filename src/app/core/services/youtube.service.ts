import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface VideoYouTube {
  id: string;
  titulo: string;
  canal: string;
  imagenUrl: string;
  url: string;
}

export interface EstadoYouTube {
  sonando: boolean;
  video: VideoYouTube | null;
  cola: VideoYouTube[];
  actualizadoEn: number;
}

@Injectable({ providedIn: 'root' })
export class YouTubeService {

  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/api/youtube`;

  readonly estado = signal<EstadoYouTube>({ sonando: false, video: null, cola: [], actualizadoEn: 0 });

  buscar(consulta: string, limite = 5): Observable<VideoYouTube[]> {
    const params = new HttpParams().set('q', consulta).set('limite', limite);
    return this.http.get<VideoYouTube[]>(`${this.API}/search`, { params });
  }

  actual(): Observable<EstadoYouTube> {
    return this.http.get<EstadoYouTube>(`${this.API}/current`).pipe(tap((e) => this.estado.set(e)));
  }

  play(video?: string, consulta?: string): Observable<EstadoYouTube> {
    let params = new HttpParams();
    if (video) params = params.set('video', video);
    if (consulta) params = params.set('consulta', consulta);

    return this.http.post<EstadoYouTube>(`${this.API}/play`, {}, { params })
      .pipe(tap((e) => this.estado.set(e)));
  }

  pausar(): Observable<EstadoYouTube> {
    return this.http.post<EstadoYouTube>(`${this.API}/pause`, {})
      .pipe(tap((e) => this.estado.set(e)));
  }

  reanudar(): Observable<EstadoYouTube> {
    return this.http.post<EstadoYouTube>(`${this.API}/resume`, {})
      .pipe(tap((e) => this.estado.set(e)));
  }

  saltar(): Observable<EstadoYouTube> {
    return this.http.post<EstadoYouTube>(`${this.API}/next`, {})
      .pipe(tap((e) => this.estado.set(e)));
  }

  detener(): Observable<EstadoYouTube> {
    return this.http.post<EstadoYouTube>(`${this.API}/stop`, {})
      .pipe(tap((e) => this.estado.set(e)));
  }
}
