import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { PrivateLayoutComponent } from './layout/private-layout/private-layout.component';
import { NfcProfileComponent } from './shared/components/nfc-profile/nfc-profile.component';
import { OAuthCallbackComponent } from '../app/features/auth/outh-callback/outh-callback.component';
import { PortafolioComponent } from './features/portafolio/portafolio.component';
import { LinkHubComponent } from './features/link-hub/link-hub.component';
import { authGuard } from './core/guards/auth.guard';
import { publicGuard } from './core/guards/public.guard';
import { cvPublicoGuard } from './core/guards/cv-publico.guard';
import { PerfilComponent } from './features/perfil/perfil.component';
import { FeedComponent } from './features/feed/feed.component';
import { ProyectosComponent } from './features/proyectos/proyectos.component';

import { InformacionPersonalComponent } from './features/informacion-personal/informacion-personal.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,

    children: [
      { path: '', component: NfcProfileComponent, canActivate: [publicGuard] },
      { path: 'proyectos', component: ProyectosComponent },
      { path: 'proyectos/:username', component: ProyectosComponent },
      { path: 'perfil', component: PerfilComponent },
      { path: 'perfil/:username', component: PerfilComponent },

      // Hoja de vida publica: la ve cualquiera (con o sin sesion).
      // Si hay sesion, el guard la lleva a /app/u/:username (misma vista,
      // dentro del layout privado y en modo lectura).
      { path: 'u/:username', component: InformacionPersonalComponent, canActivate: [cvPublicoGuard] },

      { path: 'informacion-personal', component: InformacionPersonalComponent }
    ]
  },

  { path: 'oauth2/callback', component: OAuthCallbackComponent },

  {
    path: 'app',
    component: PrivateLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: FeedComponent },
      { path: 'informacion-personal', component: InformacionPersonalComponent },
      { path: 'u/:username', component: InformacionPersonalComponent },
      { path: 'proyectos', component: ProyectosComponent },
      { path: 'proyectos/:username', component: ProyectosComponent },
      { path: 'perfil', component: PerfilComponent },
      { path: 'perfil/:username', component: PerfilComponent },
      { path: 'portafolio', component: PortafolioComponent },
      { path: 'hub', component: LinkHubComponent }
    ]
  },

  { path: '**', redirectTo: '' }
];
