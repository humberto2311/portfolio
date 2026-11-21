import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { TokenService } from '../services/token.service';

/** Rutas que nunca deben disparar una renovación (si fallan, fallan). */
const SIN_RENOVAR = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/logout'];

/**
 * Pone el access token en cada petición y, si el servidor responde 401, lo
 * renueva una vez con el refresh y reintenta. Varias peticiones que fallan a la
 * vez comparten la misma renovación (TokenService la deja en curso).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenService);
  const router = inject(Router);

  const esAuth = SIN_RENOVAR.some((ruta) => req.url.includes(ruta));
  const token = tokens.token();

  const peticion = token && !esAuth
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(peticion).pipe(
    catchError((error: HttpErrorResponse) => {
      const puedeRenovar = error.status === 401 && !esAuth;

      if (!puedeRenovar) return throwError(() => error);

      return tokens.renovar().pipe(
        switchMap((sesion) => next(req.clone({ setHeaders: { Authorization: `Bearer ${sesion.token}` } }))),
        catchError((fallo) => {
          // El refresh tampoco sirve: la sesión terminó, se vuelve al inicio.
          tokens.limpiar();
          router.navigate(['/']);
          return throwError(() => fallo);
        })
      );
    })
  );
};
