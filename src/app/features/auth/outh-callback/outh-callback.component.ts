import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

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

 ngOnInit(): void {
  this.route.queryParams.subscribe(params => {
    const token = params['token'];
    const error = params['error'];

    // El GitHub ya pertenece a otra cuenta del sistema
    if (error === 'git_en_uso') {
      sessionStorage.removeItem('nfc_return_to');
      this.router.navigate(['/app/proyectos'], { queryParams: { gitError: 1 } });
      return;
    }

    if (token) {
      const retorno = sessionStorage.getItem('nfc_return_to');
      sessionStorage.removeItem('nfc_return_to');

      this.authService.handleOAuthSuccess(token); // navega a /app

      if (retorno) {
        // Vuelve a donde estaba (ej. /app/proyectos?importar=1)
        setTimeout(() => this.router.navigateByUrl(retorno), 0);
      }
    } else {
      console.error('No se recibió el token de autenticación. Error recibido:', error);
      this.router.navigate(['/']);
    }
  });
}
}