import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // El refresh token puede dar una sesión viva aunque esta pestaña acabe de abrirse.
  return authService.sesionLista().pipe(
    map((haySesion) => {
      if (haySesion) return true;

      const username = route.paramMap.get('username');
      if (username && state.url.startsWith('/app/u/')) {
        return router.createUrlTree(['/u', username]);
      }

      router.navigate(['/']);
      return false;
    })
  );

  // Enlace autenticado de una hoja de vida (/app/u/:username) sin sesión:
  // se manda a la versión pública equivalente.
  const username = route.paramMap.get('username');
  if (username && state.url.startsWith('/app/u/')) {
    return router.createUrlTree(['/u', username]);
  }

  router.navigate(['/']);
  return false;
};
