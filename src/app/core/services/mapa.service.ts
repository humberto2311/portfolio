import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FotoLugar {
  id: string;
  lat: number;
  lng: number;
  miniatura: string;
  grande: string;
  fecha: string;
  camara: string;
  panoramica: boolean;
  enlace: string;
}

export interface FotosLugar {
  configurado: boolean;
  lat: number;
  lng: number;
  radio: number;
  total: number;
  fotos: FotoLugar[];
}

export interface UbicacionEmpresa {
  empresa: string;
  ciudad: string;
  lat: number;
  lng: number;
  direccion: string;
  fuente: string;
  encontrada: boolean;
}

@Injectable({ providedIn: 'root' })
export class MapaService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/mapa`;

  readonly ubicaciones = signal<UbicacionMapa[]>([]);
  readonly miUbicacion = signal<UbicacionMapa | null>(null);
  readonly cargandoUbicaciones = signal(false);

  cargarUbicaciones(): Observable<UbicacionMapa[]> {
    this.cargandoUbicaciones.set(true);

    return this.http.get<UbicacionMapa[]>(`${this.base}/ubicaciones`).pipe(
      tap((lista) => {
        this.ubicaciones.set(lista ?? []);
        this.cargandoUbicaciones.set(false);
      }),
      catchError(() => {
        this.cargandoUbicaciones.set(false);
        return of([] as UbicacionMapa[]);
      })
    );
  }

  cargarMiUbicacion(): Observable<UbicacionMapa | null> {
    return this.http.get<UbicacionMapa>(`${this.base}/ubicaciones/mias`, { observe: 'response' }).pipe(
      map((respuesta) => respuesta.body ?? null),
      tap((ubicacion) => this.miUbicacion.set(ubicacion)),
      catchError(() => {
        this.miUbicacion.set(null);
        return of(null);
      })
    );
  }

  publicarUbicacion(datos: PublicarUbicacion): Observable<UbicacionMapa> {
    return this.http.put<UbicacionMapa>(`${this.base}/ubicaciones`, datos).pipe(
      tap((ubicacion) => {
        this.miUbicacion.set(ubicacion);
        this.ubicaciones.update((lista) => {
          const otras = lista.filter((item) => item.usuarioId !== ubicacion.usuarioId);

          return ubicacion.visibilidad === 'PRIVATE' || ubicacion.lat == null
            ? otras
            : [ubicacion, ...otras];
        });
      })
    );
  }

  ocultarUbicacion(): Observable<void> {
    return this.http.delete<void>(`${this.base}/ubicaciones`).pipe(
      tap(() => {
        this.miUbicacion.set(null);
        this.ubicaciones.update((lista) => lista.filter((item) => !item.propio));
      })
    );
  }

  ubicacionEmpresa(empresa: string, ciudad: string): Observable<UbicacionEmpresa> {
    const params = new HttpParams().set('empresa', empresa ?? '').set('ciudad', ciudad ?? '');

    return this.http.get<UbicacionEmpresa>(`${this.base}/ubicacion-empresa`, { params }).pipe(
      catchError(() =>
        of({
          empresa,
          ciudad,
          lat: 0,
          lng: 0,
          direccion: '',
          fuente: 'sin-datos',
          encontrada: false,
        } as UbicacionEmpresa),
      ),
    );
  }

  fotos(lat: number, lng: number, radio = 150): Observable<FotosLugar> {
    const params = new HttpParams()
      .set('lat', lat)
      .set('lng', lng)
      .set('radio', radio);

    return this.http.get<FotosLugar>(`${this.base}/fotos`, { params }).pipe(
      catchError(() =>
        of({
          configurado: false,
          lat,
          lng,
          radio,
          total: 0,
          fotos: [],
        } as FotosLugar),
      ),
    );
  }
}

export type VisibilidadUbicacion = 'PRIVATE' | 'FRIENDS' | 'PUBLIC';

export interface UbicacionMapa {
  usuarioId: string;
  nombre: string;
  avatar: string | null;
  lat: number;
  lng: number;
  ciudad: string | null;
  visibilidad: VisibilidadUbicacion;
  propio: boolean;
  actualizadoEn: string;
}

export interface PublicarUbicacion {
  visibilidad: VisibilidadUbicacion;
  lat?: number | null;
  lng?: number | null;
  ciudad?: string | null;
  origen?: string | null;
}
