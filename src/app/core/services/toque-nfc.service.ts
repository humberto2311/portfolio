import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, firstValueFrom, map, of } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../../environments/environment';

export type OrigenToque = 'EMISION' | 'ETIQUETA' | 'NAVEGADOR' | 'QR';

export interface ToqueNfc {
  usuarioId: string;
  tarjeta?: string;
  enlace?: string;
  origen: OrigenToque;
  latitud?: number;
  longitud?: number;
  precisionMetros?: number;
  dispositivoMarca?: string;
  dispositivoModelo?: string;
  sistemaOperativo?: string;
  versionSistema?: string;
  tieneApp?: boolean;
}

interface Punto {
  latitud: number;
  longitud: number;
  precisionMetros: number;
}

export interface ToqueDetalle {
  id: string;
  tarjeta?: string;
  enlace?: string;
  origen: string;
  latitud?: number;
  longitud?: number;
  precisionMetros?: number;
  dispositivoMarca?: string;
  dispositivoModelo?: string;
  sistemaOperativo?: string;
  versionSistema?: string;
  tieneApp?: boolean;
  visitante?: string;
  visitanteId?: string;
  visitanteUsuario?: string;
  visitanteNombre?: string;
  creadoEn?: string;
}

export interface ListaToques {
  total: number;
  toques: ToqueDetalle[];
}

export interface ContactoNfc {
  id: string;
  usuario: string;
  nombre?: string;
  correo?: string;
  ultimoToque?: string;
}

@Injectable({ providedIn: 'root' })
export class ToqueNfcService {
  private readonly http = inject(HttpClient);
  private readonly plataforma = inject(PLATFORM_ID);
  private readonly base = `${environment.apiUrl}/api/toques`;

  async enlaceDe(userId: string, slug: string): Promise<string> {
    if (!isPlatformBrowser(this.plataforma)) return '';

    try {
      const respuesta = await firstValueFrom(
        this.http.get<{ enlace: string }>(`${this.base}/enlace/${userId}/${slug}`)
      );
      return respuesta?.enlace ?? '';
    } catch {
      return '';
    }
  }

  sugerencias(): Observable<ContactoNfc[]> {
    return this.http.get<{ sugerencias?: ContactoNfc[] }>(`${this.base}/sugerencias`).pipe(
      map((respuesta) => respuesta?.sugerencias ?? []),
      catchError(() => of([] as ContactoNfc[])),
    );
  }

  async mis(): Promise<ListaToques> {
    if (!isPlatformBrowser(this.plataforma)) return { total: 0, toques: [] };

    try {
      const respuesta = await firstValueFrom(this.http.get<ListaToques>(`${this.base}/mis`));
      const lista = respuesta?.toques ?? [];

      return {
        total: respuesta?.total ?? 0,
        toques: Array.isArray(lista) ? lista : [],
      };
    } catch {
      return { total: 0, toques: [] };
    }
  }

  async registrar(toque: ToqueNfc): Promise<boolean> {
    if (!isPlatformBrowser(this.plataforma)) return false;

    try {
      await firstValueFrom(
        this.http.post(`${this.base}`, await this.conUbicacion(toque), { responseType: 'text' })
      );
      return true;
    } catch {
      return false;
    }
  }

  private async conUbicacion(toque: ToqueNfc): Promise<ToqueNfc> {
    const punto = await this.posicion();
    if (!punto) return toque;

    return { ...toque, ...punto };
  }

  private async ubicacionYaPermitida(): Promise<boolean> {
    try {
      const estado = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
      return estado?.state === 'granted';
    } catch {
      return false;
    }
  }

  private async posicion(): Promise<Punto | null> {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        const lectura = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 4000 });

        return {
          latitud: lectura.coords.latitude,
          longitud: lectura.coords.longitude,
          precisionMetros: lectura.coords.accuracy,
        };
      } catch {
        return null;
      }
    }

    if (!navigator.geolocation) return null;

    if (!(await this.ubicacionYaPermitida())) return null;

    return new Promise((resolver) => {
      navigator.geolocation.getCurrentPosition(
        (lectura) => resolver({
          latitud: lectura.coords.latitude,
          longitud: lectura.coords.longitude,
          precisionMetros: lectura.coords.accuracy,
        }),
        () => resolver(null),
        { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 },
      );
    });
  }
}
