import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { PrivateLayoutComponent } from './layout/private-layout/private-layout.component';
import { HomeComponent } from './features/home/home.component';
import { InformacionPersonalComponent } from './features/informacion-personal/informacion-personal.component';
import { ProyectosComponent } from './features/proyectos/proyectos.component';
import { NfcProfileComponent } from './shared/components/nfc-profile/nfc-profile.component';
import { OAuthCallbackComponent } from '../app/features/auth/outh-callback/outh-callback.component';

// Tus guards
import { authGuard } from './core/guards/auth.guard';
import { publicGuard } from './core/guards/public.guard'; // <-- Importas el nuevo

export const routes: Routes = [
  // 1. LAYOUT PÚBLICO (Portafolio)
  {
    path: '',
    component: LayoutComponent,
    canActivate: [publicGuard], // <-- PROTEGIDO: Si estás logueado, te bota a /app
    children: [
      { path: '', component: NfcProfileComponent },
     { path: 'informacion-personal', component: InformacionPersonalComponent }, // 👈
      { path: 'proyectos', component: ProyectosComponent }
    ]
  },

  // 2. OAUTH CALLBACK (No lleva guard para que pueda procesar el token)
  { 
    path: 'oauth2/callback', 
    component: OAuthCallbackComponent 
  },

  // 3. LAYOUT PRIVADO (Aplicación)
  {
    path: 'app',
    component: PrivateLayoutComponent,
    canActivate: [authGuard], // <-- PROTEGIDO: Si NO estás logueado, te bota a /
    children: [
      { path: '', component: HomeComponent }, 
      { path: 'informacion-personal', component: InformacionPersonalComponent },
      { path: 'proyectos', component: ProyectosComponent }
    ]
  },

  // 4. Redirección
  { path: '**', redirectTo: '' }
];