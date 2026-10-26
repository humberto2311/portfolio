// src/app/core/guards/public.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const publicGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si el usuario YA está autenticado, lo sacamos del portafolio 
  // y lo mandamos directo a su aplicación privada.
  if (authService.isAuthenticated()) {
    router.navigate(['/app']);
    return false; // Bloquea el acceso a la ruta pública
  }
  
  // Si no está autenticado, lo dejamos ver tu portafolio sin problema.
  return true;
};