import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Sesion {
  token: string;
  refreshToken?: string;
  expiresIn?: number;
  user: {
    id: string;
    fullName: string;
    email: string;
    role?: string;
    [clave: string]: unknown;
  };
}

/**
 * Dueño de la sesión en el navegador.
 *
 * <p>El access token vive <b>solo en memoria</b> (una señal): un XSS no lo lee de
 * localStorage. El refresh token lo guarda el servidor en una cookie HttpOnly
 * que JavaScript no puede tocar. Al recargar la página se recupera la sesión con
 * `/api/auth/refresh`.</p>
 */
@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly API = `${environment.apiUrl}/api/auth`;
  /** Dónde guarda el refresh la app nativa cuando no hay cookies fiables. */
  private readonly CLAVE_NATIVA = 'nfc_refresh';

  private accessToken: string | null = null;
  private expiraEn = 0;
  /**
   * Copia del access token en sessionStorage: en local, `ng serve` recarga el módulo
   * al cambiar un archivo y la memoria se pierde, y al volver de Spotify en la misma
   * pestaña la sesión debe seguir viva. En producción (environment.production) no se usa:
   * ahí el token vive solo en memoria y se recupera con /refresh.
   */
  private readonly CLAVE_ACCESO = 'nfc_access';
  private readonly guardarAccesoEnPestana = !environment.production;
  /** Una sola renovación a la vez: las demás peticiones esperan a esta. */
  private renovando$: Observable<Sesion> | null = null;

  readonly usuario = signal<Sesion['user'] | null>(null);
  readonly autenticado = signal(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.leerRefreshNativo();
      this.leerAccesoDeDesarrollo();
    }
  }

  token(): string | null {
    return this.accessToken;
  }

  /** Solo en desarrollo: recupera el token guardado en esta pestaña (ver CLAVE_ACCESO). */
  private leerAccesoDeDesarrollo(): void {
    if (!this.guardarAccesoEnPestana) return;

    try {
      const crudo = sessionStorage.getItem(this.CLAVE_ACCESO);
      if (!crudo) return;

      const guardado = JSON.parse(crudo) as { token: string; expiraEn: number; usuario?: Sesion['user'] };
      if (!guardado.token || guardado.expiraEn <= Date.now()) {
        sessionStorage.removeItem(this.CLAVE_ACCESO);
        return;
      }

      this.accessToken = guardado.token;
      this.expiraEn = guardado.expiraEn;
      if (guardado.usuario) {
        this.usuario.set(guardado.usuario);
        this.autenticado.set(true);
      }
    } catch {
      sessionStorage.removeItem(this.CLAVE_ACCESO);
    }
  }

  private guardarAcceso(): void {
    if (!this.guardarAccesoEnPestana) return;

    try {
      if (!this.accessToken) {
        sessionStorage.removeItem(this.CLAVE_ACCESO);
        return;
      }
      sessionStorage.setItem(this.CLAVE_ACCESO, JSON.stringify({
        token: this.accessToken,
        expiraEn: this.expiraEn,
        usuario: this.usuario() ?? undefined
      }));
    } catch {
      // sessionStorage lleno o bloqueado: la sesión sigue en memoria.
    }
  }

  /** ¿Queda poco para que venza? Se renueva antes de usarlo, no después del 401. */
  porVencer(margenSegundos = 60): boolean {
    return !!this.accessToken && Date.now() > this.expiraEn - margenSegundos * 1000;
  }

  guardar(sesion: Sesion): void {
    this.accessToken = sesion.token;
    this.expiraEn = Date.now() + (sesion.expiresIn ?? 900) * 1000;
    if (sesion.user) {
      this.usuario.set(sesion.user);
      this.autenticado.set(true);
    }
    if (sesion.refreshToken) {
      this.guardarRefreshNativo(sesion.refreshToken);
    }
    this.guardarAcceso();
  }

  limpiar(): void {
    this.accessToken = null;
    this.expiraEn = 0;
    this.usuario.set(null);
    this.autenticado.set(false);
    this.borrarRefreshNativo();
    this.guardarAcceso();
  }

  /** Pide un par nuevo (access + refresh) usando la cookie o el refresh nativo. */
  renovar(): Observable<Sesion> {
    if (this.renovando$) return this.renovando$;

    const refreshNativo = this.refreshNativo();
    const cabeceras = refreshNativo ? { 'X-Refresh-Token': refreshNativo } : undefined;

    this.renovando$ = this.http.post<Sesion>(`${this.API}/refresh`, {}, {
      withCredentials: true,
      ...(cabeceras ? { headers: cabeceras } : {})
    }).pipe(
      tap((sesion) => this.guardar(sesion)),
      catchError((error) => {
        this.limpiar();
        throw error;
      }),
      shareReplay(1)
    );

    this.renovando$.subscribe({
      next: () => (this.renovando$ = null),
      error: () => (this.renovando$ = null)
    });

    return this.renovando$;
  }

  /** Recupera la sesión al abrir la app. Nunca lanza: sin refresh válido, sigue anónimo. */
  arrancar(): Observable<boolean> {
    if (!isPlatformBrowser(this.platformId)) return of(false);
    if (this.accessToken && !this.porVencer(120)) return of(true);

    return this.renovar().pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  cerrarSesion(): Observable<void> {
    const refreshNativo = this.refreshNativo();
    const cabeceras = refreshNativo ? { 'X-Refresh-Token': refreshNativo } : undefined;

    return this.http.post<void>(`${this.API}/logout`, {}, {
      withCredentials: true,
      ...(cabeceras ? { headers: cabeceras } : {})
    }).pipe(
      catchError(() => of(undefined)),
      switchMap(() => {
        this.limpiar();
        return of(undefined);
      })
    );
  }

  /** Cierra todas las sesiones de la cuenta, en todos los equipos. */
  cerrarTodasLasSesiones(): Observable<unknown> {
    return this.http.post(`${this.API}/sesiones/cerrar`, {}, { withCredentials: true }).pipe(
      tap(() => this.limpiar())
    );
  }

  // ---- Almacenamiento del refresh en la app nativa (Capacitor) ----
  // En el navegador manda la cookie HttpOnly; esto es solo el respaldo cuando
  // el WebView no conserva cookies.

  private esNativo(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    const origen = window.location.origin;
    return origen.startsWith('capacitor://') || origen.startsWith('file://');
  }

  private guardarRefreshNativo(refresh: string): void {
    if (!this.esNativo()) return;
    try {
      localStorage.setItem(this.CLAVE_NATIVA, refresh);
    } catch {
      // Sin almacenamiento disponible: la sesión simplemente no sobrevive al cierre.
    }
  }

  private leerRefreshNativo(): void {
    if (!this.esNativo()) return;
    try {
      this.refreshNativoActual = localStorage.getItem(this.CLAVE_NATIVA);
    } catch {
      this.refreshNativoActual = null;
    }
  }

  private borrarRefreshNativo(): void {
    this.refreshNativoActual = null;
    if (!this.esNativo()) return;
    try {
      localStorage.removeItem(this.CLAVE_NATIVA);
    } catch {
      // nada que borrar
    }
  }

  private refreshNativoActual: string | null = null;

  private refreshNativo(): string | null {
    return this.esNativo() ? this.refreshNativoActual : null;
  }
}
