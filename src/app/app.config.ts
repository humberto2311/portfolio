// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http'; // 👈 Importamos withInterceptors

import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes), 
    // Sin provideClientHydration(): en producción Render sirve los estáticos y los
    // temporizadores vivos (Spotify cada 6 s, notificaciones cada 60 s) impedían que
    // la app quedara "estable", disparando NG0506 en consola sin aportar nada.
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor])
    )
  ]
};