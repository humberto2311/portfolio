import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../core/services/auth.service'; // Ajusta la ruta si es necesario

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  
  // 1. Obtener el token del localStorage
  const token = localStorage.getItem('token');

  // 2. Si hay token, clonar la petición y agregar la cabecera Authorization
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // 3. Manejar la petición y atrapar errores
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si el error es 401 (No autorizado) o 403 (Prohibido)
      if (error.status === 401 || error.status === 403) {
        console.warn('Sesión expirada o no autorizada');
        // Limpiamos la sesión y mandamos al inicio
        authService.logout(); 
        router.navigate(['/']);
      }
      return throwError(() => error);
    })
  );
};