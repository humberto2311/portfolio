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

@Injectable({ providedIn: 'root' })
export class MapaService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/mapa`;

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
