import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CrearEstado, Estado, GrupoEstados, PistaMusica } from '../models/estado.model';
import { AudienciaContenido, VisibilidadContenido } from '../models/privacidad.model';

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

export interface BorradorEstado {
  texto: string;
  imagen: string | null;
  video: string | null;
  audio: string | null;
  stickers: string[];
  musica: PistaMusica | null;
  visibilidad?: VisibilidadContenido;
  permitidos?: string[];
  excluidos?: string[];
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

  subirArchivo(archivo: File): Observable<string> {
    const datos = new FormData();

    datos.append('file', archivo);

    return this.http.post<{ url: string }>(`${environment.apiUrl}/api/archivos`, datos)
      .pipe(map((respuesta) => `${environment.apiUrl}${respuesta.url}`));
  }

  publicar(estado: CrearEstado): Observable<Estado> {
    return this.http.post<Estado>(this.base, estado);
  }

  marcarVista(estadoId: string): Observable<Estado> {
    return this.http.post<Estado>(`${this.base}/${estadoId}/vista`, {});
  }

  /**
   * Manda la reacción y/o el texto de una historia al chat privado del dueño.
   * Devuelve el mensaje tal como quedó guardado.
   */
  responder(estadoId: string, reaccion: string | null, texto: string | null): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${this.base}/${estadoId}/responder`, {
      reaccion: reaccion ?? null,
      texto: texto ?? null
    });
  }

  borrar(estadoId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${estadoId}`);
  }

  publicarBorrador(borrador: BorradorEstado): Observable<Estado> {
    const media = borrador.video ?? borrador.imagen ?? borrador.audio;
    const pista = borrador.musica;
    const texto = borrador.texto.trim();

    return this.publicar({
      tipo: media ? 'FOTO' : 'TEXTO',
      contenidoUrl: media,
      texto: texto || null,
      fondo: media ? null : FONDOS_ESTADO[0],
      stickers: borrador.stickers,
      musicaId: pista?.id ?? null,
      musicaTitulo: pista?.titulo ?? null,
      musicaArtista: pista?.artista ?? null,
      musicaUrl: pista?.url || null,
      duracionSegundos: media ? 10 : 8,
      visibilidad: borrador.visibilidad ?? 'PUBLICO',
      audiencia: {
        visibilidad: borrador.visibilidad ?? 'PUBLICO',
        permitidos: borrador.permitidos ?? [],
        excluidos: borrador.excluidos ?? []
      }
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
