import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthUser } from '../models/AuthUser';
import { ModalService } from './modal.service';
import { Sesion, TokenService } from './token.service';
import { environment } from '../../../environments/environment';

/** Lo que /api/cuenta/estado dice de la cuenta conectada. */
export interface EstadoCuenta {
  email: string;
  verificado: boolean;
  tieneContrasena: boolean;
  proveedor: string;
  ultimoAcceso: string | null;
  nombre: string | null;
  telefono: string | null;
  genero: string | null;
  nacimiento: string | null;
}

/** Datos editables de la cuenta (user_profile). */
export interface DatosCuenta {
  id: string;
  fullName: string;
  email: string;
  gitUsername?: string | null;
  phone?: string | null;
  gender?: string | null;
  birthDate?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private modal = inject(ModalService);
  private sesion = inject(TokenService);

  private readonly API_URL = `${environment.apiUrl}/api/auth`;
  private readonly CUENTA_URL = `${environment.apiUrl}/api/cuenta`;

  readonly currentUser = signal<AuthUser | null>(null);
  readonly isAuthenticated = signal(false);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  /** Correo de la cuenta que quedó esperando su código; null cuando no hay nada pendiente. */
  readonly pendiente = signal<string | null>(null);
  readonly correoEnviado = signal(true);
  /** Solo cuando el backend no tiene SMTP: dice dónde leer el código. */
  readonly pistaDesarrollo = signal<string | null>(null);

  /**
   * Al abrir la app no hay token en ningún almacenamiento del navegador: se
   * recupera la sesión con el refresh (cookie HttpOnly) y, si no hay, se sigue
   * como anónimo sin bloquear el arranque.
   */
  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.sesion.arrancar().subscribe((haySesion) => {
        const usuario = this.sesion.usuario();
        if (haySesion && usuario) {
          this.currentUser.set(usuario as unknown as AuthUser);
          this.isAuthenticated.set(true);
        }
        this.listo.set(true);
      });
    } else {
      this.listo.set(true);
    }
  }

  /** true cuando ya se intentó recuperar la sesión (evita parpadeos en los guards). */
  readonly listo = signal(false);

  loginWithProvider(provider: 'github' | 'google' | 'microsoft') {
    window.location.href = `${environment.apiUrl}/oauth2/authorization/${provider}`;
  }

  // ---- Email / Password ----
  login(email: string, password: string) {
    this.isLoading.set(true);
    this.error.set(null);
    this.http.post<Sesion>(`${this.API_URL}/login`, { email, password }, { withCredentials: true })
      .subscribe({
        next: (res) => this.handleSuccess(res),
        error: (err) => {
          // 403 con verificacionPendiente: la cuenta existe pero nadie abrió el correo todavía.
          if (err.status === 403 && err.error?.verificacionPendiente) {
            this.pendiente.set(err.error.email ?? email);
            this.correoEnviado.set(true);
            this.error.set(null);
          } else {
            this.error.set(err.error?.message ?? 'Credenciales inválidas');
          }
          this.isLoading.set(false);
        }
      });
  }

  // ---- Register ----
  /**
   * El registro ya no inicia sesión: deja la cuenta pendiente hasta que el usuario
   * escriba el código que llegó por correo.
   */
  register(datos: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    phone: string;
    gender: string;
    birthDate: string;
  }) {
    this.isLoading.set(true);
    this.error.set(null);
    this.pendiente.set(null);
    this.pistaDesarrollo.set(null);

    this.http.post<{ email: string; correoEnviado: boolean; codigoDeDesarrollo?: string }>(`${this.API_URL}/register`, datos)
      .subscribe({
        next: (res) => {
          this.pendiente.set(res.email ?? datos.email);
          this.correoEnviado.set(res.correoEnviado !== false);
          this.pistaDesarrollo.set(res.codigoDeDesarrollo ?? null);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set(err.error?.message ?? 'No se pudo crear la cuenta');
          this.isLoading.set(false);
        }
      });
  }

  /**
   * Canjea el código por una sesión. Devuelve el usuario verificado, o null si el código
   * falló (el mensaje de error queda en la señal `error`).
   */
  verificarCodigo(codigo: string, email = this.pendiente(), redirigir = true): Observable<AuthUser | null> {
    if (!email) return of(null);

    this.isLoading.set(true);
    this.error.set(null);

    return this.http.post<Sesion>(`${this.API_URL}/verificar`, { email, codigo }, { withCredentials: true })
      .pipe(
        map((res) => {
          this.pendiente.set(null);
          this.guardarSesion(res);
          if (redirigir) this.router.navigate(['/app']);
          return res.user as unknown as AuthUser;
        }),
        catchError((err) => {
          this.error.set(err.error?.message ?? 'El código no es válido o venció');
          this.isLoading.set(false);
          return of(null);
        })
      );
  }

  reenviarCodigo() {
    const email = this.pendiente();
    if (!email) return;

    this.isLoading.set(true);

    this.reenviarCodigoPara(email).subscribe({
      next: (res) => {
        const enviado = res.correoEnviado !== false;
        this.correoEnviado.set(enviado);
        if (!enviado) this.pistaDesarrollo.set('Sin correo configurado: el código quedó en la consola del backend');
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  /** Reenviar cuando el usuario ya está dentro y no hay paso de código abierto. */
  reenviarCodigoPara(email: string): Observable<{ correoEnviado: boolean }> {
    return this.http.post<{ correoEnviado: boolean }>(`${this.API_URL}/verificar/reenviar`, { email });
  }

  cancelarVerificacion() {
    this.pendiente.set(null);
    this.pistaDesarrollo.set(null);
    this.error.set(null);
  }

  // ---- Cuenta (requiere sesión) ----
  cambiarContrasena(actual: string, nueva: string, confirmacion: string) {
    return this.http.put<{ message: string }>(`${this.CUENTA_URL}/contrasena`,
      { actual, nueva, confirmacion });
  }

  actualizarPerfil(datos: {
    fullName?: string; phone?: string; gender?: string; birthDate?: string;
  }) {
    return this.http.put<DatosCuenta>(`${this.CUENTA_URL}/perfil`, datos);
  }

  cerrarSesiones() {
    return this.http.post<{ message: string }>(`${this.CUENTA_URL}/sesiones/cerrar`, {});
  }

  /** Refleja en la sesión local lo que acaba de guardarse en el servidor. */
  sincronizarUsuario(cambios: Partial<AuthUser>) {
    const actual = this.currentUser();
    if (!actual) return;
    this.currentUser.set({ ...actual, ...cambios });
  }

  estado(): Observable<EstadoCuenta> {
    return this.http.get<EstadoCuenta>(`${this.CUENTA_URL}/estado`);
  }

  // ---- OAuth Success Callback ----
  /**
   * El backend ya dejó el refresh en su cookie HttpOnly; aquí se cambia el
   * access token de un solo uso por el par completo y se entra a la app.
   */
  handleOAuthSuccess(_token: string) {
    this.isLoading.set(true);

    this.sesion.renovar().subscribe({
      next: (sesion) => {
        this.currentUser.set(sesion.user as unknown as AuthUser);
        this.isAuthenticated.set(true);
        this.isLoading.set(false);
        this.router.navigate(['/app']);
      },
      error: () => {
        this.error.set('No pudimos abrir tu sesión. Intenta entrar otra vez.');
        this.isLoading.set(false);
        this.router.navigate(['/']);
      }
    });
  }

  private handleSuccess(res: Sesion) {
    this.guardarSesion(res);
    this.router.navigate(['/app']);
  }

  /** Guarda token y usuario en la sesión local y baja el modal; no mueve a nadie de pantalla. */
  private guardarSesion(res: Sesion) {
    this.sesion.guardar(res);

    this.modal.closeLogin();
    this.currentUser.set(res.user as unknown as AuthUser);
    this.isAuthenticated.set(true);
    this.isLoading.set(false);
  }

  logout() {
    // El servidor revoca el refresh y borra su cookie; aquí se limpia la memoria.
    this.sesion.cerrarSesion().subscribe();
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.pendiente.set(null);
    this.router.navigate(['/']);
  }
  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  /** Espera a saber si el refresh token da una sesión viva (una sola vez). */
  sesionLista() {
    return this.listo()
      ? of(this.isAuthenticated())
      : this.sesion.arrancar().pipe(map((hay) => hay || this.isAuthenticated()));
  }
}