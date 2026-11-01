import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * La hoja de vida pública (/u/:username) se puede ver siempre, con o sin
 * sesión. Si hay sesión iniciada se muestra dentro del layout privado
 * (/app/u/:username) para poder navegar por la app, pero en modo lectura.
 */
export const cvPublicoGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const username = route.paramMap.get('username') ?? '';
    return router.createUrlTree(['/app/u', username]);
  }

  return true;
};
