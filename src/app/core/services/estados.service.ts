import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CrearEstado, Estado, GrupoEstados, PistaMusica } from '../models/estado.model';

export type { PistaMusica };

export const FONDOS_ESTADO: string[] = [
  '#0d1117',
  '#1f2937',
  '#1e3a8a',
  '#4a9eff',
  '#0f766e',
  '#7c3aed',
  '#9d174d',
  '#b45309'
];

export const STICKERS_ESTADO: string[] = [
  '🔥', '🚀', '💼', '🤝', '💡', '🎯', '⭐', '📈',
  '☕', '🎧', '📍', '✅', '❤️', '👏', '💬', '🏆',
  '🧠', '⚡', '🎉', '🙌'
];

export const PISTAS_DEMO: PistaMusica[] = [
  { id: 'demo-1', titulo: 'Cielo Eléctrico', artista: 'Nova Sur', url: '', portada: '' },
  { id: 'demo-2', titulo: 'Madrugada en Bogotá', artista: 'Los Andes', url: '', portada: '' },
  { id: 'demo-3', titulo: 'Modo Enfoque', artista: 'Beats Lab', url: '', portada: '' },
  { id: 'demo-4', titulo: 'Feria de Ideas', artista: 'Colectivo 88', url: '', portada: '' },
  { id: 'demo-5', titulo: 'Pulso Digital', artista: 'Sintetika', url: '', portada: '' },
  { id: 'demo-6', titulo: 'Café y Código', artista: 'Dev Sessions', url: '', portada: '' }
];

export interface BorradorPublicacion {
  texto: string;
  imagen: string | null;
  video: string | null;
  audio: string | null;
  mediaType: 'AUDIO' | 'FOTO' | 'VIDEO' | 'TEXTO';
  stickers: string[];
  musica: PistaMusica | null;
}

@Injectable({ providedIn: 'root' })
export class EstadosService {

  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/estados`;

  bandeja(): Observable<GrupoEstados[]> {
    return this.http.get<GrupoEstados[]>(`${this.base}/bandeja`);
  }

  deUsuario(usuarioId: string): Observable<GrupoEstados> {
    return this.http.get<GrupoEstados>(`${this.base}/usuario/${usuarioId}`);
  }

  publicar(estado: CrearEstado): Observable<Estado> {
    return this.http.post<Estado>(this.base, estado);
  }

  marcarVista(estadoId: string): Observable<Estado> {
    return this.http.post<Estado>(`${this.base}/${estadoId}/vista`, {});
  }

  borrar(estadoId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${estadoId}`);
  }

  publicarPublicacion(borrador: BorradorPublicacion): Observable<unknown> {
    const pista = borrador.musica;
    const texto = borrador.stickers.length
      ? `${borrador.texto} ${borrador.stickers.join(' ')}`.trim()
      : borrador.texto;

    return this.http.post(`${environment.apiUrl}/api/posts`, {
      content: texto,
      imageUrl: borrador.imagen,
      videoUrl: borrador.video ?? borrador.audio,
      mediaType: borrador.mediaType,
      musicTitle: pista?.titulo ?? null,
      musicArtist: pista?.artista ?? null,
      musicUrl: pista?.url || null
    });
  }

  buscarMusica(texto: string): Observable<PistaMusica[]> {
    const consulta = texto.trim().toLowerCase();

    if (!consulta) return new Observable((suscriptor) => {
      suscriptor.next(PISTAS_DEMO);
      suscriptor.complete();
    });

    return new Observable((suscriptor) => {
      suscriptor.next(PISTAS_DEMO.filter((pista) =>
        pista.titulo.toLowerCase().includes(consulta)
        || pista.artista.toLowerCase().includes(consulta)));
      suscriptor.complete();
    });
  }

  leerComoDataUrl(archivo: File): Promise<string> {
    return new Promise((resolver, rechazar) => {
      const lector = new FileReader();

      lector.onload = () => resolver(String(lector.result ?? ''));
      lector.onerror = () => rechazar(new Error('No se pudo leer la imagen.'));
      lector.readAsDataURL(archivo);
    });
  }
}
