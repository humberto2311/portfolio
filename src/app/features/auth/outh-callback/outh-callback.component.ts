import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="callback-container">
      <div class="spinner"></div>
      <h2>Autenticando...</h2>
      <p>Por favor, espera un momento mientras procesamos tu cuenta.</p>
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background-color: var(--bg-main);
      color: var(--accent);
      font-family: 'Inter', sans-serif;
    }
    .spinner {
      border: 4px solid color-mix(in srgb, var(--accent) 20%, transparent);
      border-top: 4px solid var(--accent);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    h2 {
      margin: 0 0 10px 0;
      font-weight: 600;
    }
    p {
      color: var(--text-muted);
      font-size: 0.9rem;
    }
  `]
})
export class OAuthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  /** Mensajes para los errores que devuelve el back en ?error=... */
  private static readonly MENSAJES: Record<string, string> = {
    cuenta_existente: 'Ese correo ya tiene una cuenta. Entra con tu correo y contraseña.',
    sin_correo: 'Tu cuenta del proveedor no comparte un correo. Usa otra forma de entrar.',
    auth_failed: 'No pudimos completar el inicio de sesión. Intenta otra vez.',
  };

  ngOnInit(): void {
    // En el prerender (SSR) no hay sessionStorage ni cookies del usuario: solo se muestra el spinner.
    if (!isPlatformBrowser(this.platformId)) return;

    this.route.queryParams.subscribe(params => {
      const error = params['error'];
      const retorno = sessionStorage.getItem('nfc_return_to');
      sessionStorage.removeItem('nfc_return_to');

      // El GitHub ya pertenece a otra cuenta del sistema
      if (error === 'git_en_uso') {
        this.router.navigate(['/app/proyectos'], { queryParams: { gitError: 1 } });
        return;
      }

      if (error) {
        this.authService.mostrarErrorDeAcceso(
          OAuthCallbackComponent.MENSAJES[error] ?? OAuthCallbackComponent.MENSAJES['auth_failed']);
        this.router.navigate(['/']);
        return;
      }

      // El back ya no manda el token en la URL (se filtraba en historial y logs): deja la
      // sesión en una cookie HttpOnly y aquí se canjea con /api/auth/refresh.
      this.authService.handleOAuthSuccess(retorno);
    });
  }
}