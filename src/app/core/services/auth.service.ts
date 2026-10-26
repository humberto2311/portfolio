import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthUser } from '../models/AuthUser';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID); // 👈 Inyectamos el ID de plataforma

  private readonly API_URL = `${environment.apiUrl}/api/auth`;

  readonly currentUser = signal<AuthUser | null>(null);
  readonly isAuthenticated = signal(false);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    // 👇 Verificamos que estemos en el navegador antes de usar localStorage
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

  // ---- OAuth ----
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
          this.error.set(err.error?.message ?? 'Credenciales inválidas');
          this.isLoading.set(false);
        }
      });
  }

  // ---- Register ----
  register(
    name: string, 
    email: string, 
    password: string, 
    phone: string, 
    gender: string, 
    birthDate: string
  ) {
    this.isLoading.set(true);
    this.error.set(null);
    
    const payload = { 
      fullName: name, 
      email, 
      password, 
      phone, 
      gender, 
      birthDate 
    };

    this.http.post<{ token: string; user: AuthUser }>(`${this.API_URL}/register`, payload)
      .subscribe({
        next: (res) => this.handleSuccess(res),
        error: (err) => {
          this.error.set(err.error?.message ?? 'No se pudo crear la cuenta');
          this.isLoading.set(false);
        }
      });
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
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('token', res.token);
    }
    
    this.currentUser.set(res.user);
    this.isAuthenticated.set(true);
    this.isLoading.set(false);
    this.router.navigate(['/app']);
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
    }
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/']);
  }
}