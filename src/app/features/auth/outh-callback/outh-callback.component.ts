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
      background-color: #0b0f19;
      color: #00f2fe;
      font-family: 'Inter', sans-serif;
    }
    .spinner {
      border: 4px solid rgba(0, 242, 254, 0.2);
      border-top: 4px solid #00f2fe;
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
      color: #8891a3;
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
    console.log("Parámetros recibidos en la URL:", params); // <-- Añade esto
    const token = params['token'];
    const error = params['error']; // <-- Captura si hay error

    if (token) {
      this.authService.handleOAuthSuccess(token);
    } else {
      console.error('No se recibió el token de autenticación. Error recibido:', error);
      this.router.navigate(['/']);
    }
  });
}
}