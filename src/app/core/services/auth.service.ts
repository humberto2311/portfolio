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
  gitUsername?: string | null;
  gitlabUsername?: string | null;
}

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

    readonly pendiente = signal<string | null>(null);
  readonly correoEnviado = signal(true);
    readonly pistaDesarrollo = signal<string | null>(null);

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

    readonly listo = signal(false);

  loginWithProvider(provider: 'github' | 'google' | 'microsoft') {
    window.location.href = `${environment.apiUrl}/oauth2/authorization/${provider}`;
  }

  
  login(email: string, password: string) {
    this.isLoading.set(true);
    this.error.set(null);
    this.http.post<Sesion>(`${this.API_URL}/login`, { email, password }, { withCredentials: true })
      .subscribe({
        next: (res) => this.handleSuccess(res),
        error: (err) => {
          
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

    reenviarCodigoPara(email: string): Observable<{ correoEnviado: boolean }> {
    return this.http.post<{ correoEnviado: boolean }>(`${this.API_URL}/verificar/reenviar`, { email });
  }

  cancelarVerificacion() {
    this.pendiente.set(null);
    this.pistaDesarrollo.set(null);
    this.error.set(null);
  }

  
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

    sincronizarUsuario(cambios: Partial<AuthUser>) {
    const actual = this.currentUser();
    if (!actual) return;
    this.currentUser.set({ ...actual, ...cambios });
  }

  estado(): Observable<EstadoCuenta> {
    return this.http.get<EstadoCuenta>(`${this.CUENTA_URL}/estado`);
  }

  
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

    private guardarSesion(res: Sesion) {
    this.sesion.guardar(res);

    this.modal.closeLogin();
    this.currentUser.set(res.user as unknown as AuthUser);
    this.isAuthenticated.set(true);
    this.isLoading.set(false);
  }

  logout() {
    
    this.sesion.cerrarSesion().subscribe();
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.pendiente.set(null);
    this.router.navigate(['/']);
  }
  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

    sesionLista() {
    return this.listo()
      ? of(this.isAuthenticated())
      : this.sesion.arrancar().pipe(map((hay) => hay || this.isAuthenticated()));
  }
}
