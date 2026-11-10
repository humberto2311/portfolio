import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
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
