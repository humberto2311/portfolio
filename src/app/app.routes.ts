import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { PrivateLayoutComponent } from './layout/private-layout/private-layout.component';
import { HomeComponent } from './features/home/home.component';
import { InformacionPersonalComponent } from './features/informacion-personal/informacion-personal.component';
import { ProyectosComponent } from './features/proyectos/proyectos.component';
import { NfcProfileComponent } from './shared/components/nfc-profile/nfc-profile.component';
import { OAuthCallbackComponent } from '../app/features/auth/outh-callback/outh-callback.component';

// 👇 IMPORTAMOS TUS NUEVOS COMPONENTES DE PORTAFOLIO
import { PortafolioComponent } from './features/portafolio/portafolio.component'; 
// import { PortafolioPublicoComponent } from './features/portafolio-publico/portafolio-publico.component'; // Si lo separaste
import { LinkHubComponent } from './features/link-hub/link-hub.component';
// Tus guards
import { authGuard } from './core/guards/auth.guard';
import { publicGuard } from './core/guards/public.guard';
import { PerfilComponent } from './features/perfil/perfil.component';
import { FeedComponent } from './features/feed/feed.component';

export const routes: Routes = [

  {
    path: '',
    component: LayoutComponent,
    canActivate: [publicGuard], 
    children: [
      { path: '', component: NfcProfileComponent },
      { path: 'informacion-personal', component: InformacionPersonalComponent },
      { path: 'proyectos', component: ProyectosComponent },
      { path: 'perfil', component: PerfilComponent },
    ]
  },
  { 
    path: 'oauth2/callback', 
    component: OAuthCallbackComponent 
  },

  
  // 3. VISTA PÚBLICA DEL PORTAFOLIO (Sin Navbars)
  // La ruta es /u/humbertojoc (o el slug del usuario)
  {
    path: 'u/:username', 
    // component: PortafolioPublicoComponent, // 👈 Aquí va tu componente de solo lectura
    // Por ahora, si estás usando el mismo PortafolioComponent para probar:
    component: PortafolioComponent, 
  },

  
  // 4. LAYOUT PRIVADO (Editor con tu nuevo Navbar)

  {
    path: 'app',
    component: PrivateLayoutComponent,
    canActivate: [authGuard], 
    children: [
      { path: '', component: FeedComponent }, // Página principal del feed
      { path: 'informacion-personal', component: InformacionPersonalComponent },
      { path: 'proyectos', component: ProyectosComponent },
      { path: 'perfil', component: PerfilComponent },
      { path: 'portafolio', component: PortafolioComponent } , 
      { path: 'hub', component: LinkHubComponent }
    ]
  },

  // Redirección
  { path: '**', redirectTo: '' }
];