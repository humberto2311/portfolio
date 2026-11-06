import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthUser } from '../models/AuthUser';
import { ModalService } from './modal.service';
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

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          this.currentUser.set({
            id: payload.id ? String(payload.id) : '0',
            fullName: payload.fullName || 'Usuario', 
            email: payload.sub,
            role: payload.role || 'ROLE_USER'
          });
          this.isAuthenticated.set(true);
        } catch (e) {
          localStorage.removeItem('token');
        }
      }
    }
  }

  loginWithProvider(provider: 'github' | 'google' | 'microsoft') {
    window.location.href = `${environment.apiUrl}/oauth2/authorization/${provider}`;
  }

  // ---- Email / Password ----
  login(email: string, password: string) {
    this.isLoading.set(true);
    this.error.set(null);
    this.http.post<{ token: string; user: AuthUser }>(`${this.API_URL}/login`, { email, password })
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

    return this.http.post<{ token: string; user: AuthUser }>(`${this.API_URL}/verificar`, { email, codigo })
      .pipe(
        map((res) => {
          this.pendiente.set(null);
          this.guardarSesion(res);
          if (redirigir) this.router.navigate(['/app']);
          return res.user;
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
  handleOAuthSuccess(token: string) {
    this.isLoading.set(true);
    
    // Verificamos que estemos en el navegador
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('token', token);
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      const user: AuthUser = {
        id: payload.id ? String(payload.id) : '0',
        fullName: payload.fullName || payload.sub, // Si no hay fullName, usa el email
        email: payload.sub,
        role: payload.role || 'ROLE_USER'
      };

      this.currentUser.set(user);
      this.isAuthenticated.set(true);
      this.isLoading.set(false);
      
      this.router.navigate(['/app']); 
    } catch (e) {
      this.error.set('Error al procesar el token de autenticación');
      this.isLoading.set(false);
      this.router.navigate(['/']); 
    }
  }

  private handleSuccess(res: { token: string; user: AuthUser }) {
    this.guardarSesion(res);
    this.router.navigate(['/app']);
  }

  /** Guarda token y usuario en la sesión local y baja el modal; no mueve a nadie de pantalla. */
  private guardarSesion(res: { token: string; user: AuthUser }) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('token', res.token);
    }

    this.modal.closeLogin();
    this.currentUser.set(res.user);
    this.isAuthenticated.set(true);
    this.isLoading.set(false);
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
    }
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.pendiente.set(null);
    this.router.navigate(['/']);
  }
  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }
}