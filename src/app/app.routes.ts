import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { PrivateLayoutComponent } from './layout/private-layout/private-layout.component';
import { NfcProfileComponent } from './shared/components/nfc-profile/nfc-profile.component';
import { OAuthCallbackComponent } from '../app/features/auth/outh-callback/outh-callback.component';
import { PortafolioComponent } from './features/portafolio/portafolio.component'; 
import { LinkHubComponent } from './features/link-hub/link-hub.component';
import { authGuard } from './core/guards/auth.guard';
import { publicGuard } from './core/guards/public.guard';
import { PerfilComponent } from './features/perfil/perfil.component';
import { FeedComponent } from './features/feed/feed.component';
import { ProyectosComponent } from './features/proyectos/proyectos.component';
import { TalentoComponent } from './features/talento/talento.component';

import { InformacionPersonalComponent } from './features/informacion-personal/informacion-personal.component';
import { TarjetaPublicaComponent } from './features/tarjeta-publica/tarjeta-publica.component';
import { PoliticasComponent } from './features/politicas/politicas.component';
import { AjustesCuentaComponent } from './features/ajustes/ajustes-cuenta.component';
import { AjustesSeguridadComponent } from './features/ajustes/ajustes-seguridad.component';
import { EmpresaDashboardComponent } from './features/empresa/empresa-dashboard/empresa-dashboard.component';
import { EmpresaAjustesComponent } from './features/empresa/empresa-ajustes/empresa-ajustes.component';
import { EmpresaLienzoComponent } from './features/empresa/empresa-lienzo/empresa-lienzo.component';
import { EmpresaPublicaComponent } from './features/empresa/empresa-publica/empresa-publica.component';
import { EmpresaComponenteComponent } from './features/empresa/empresa-componente/empresa-componente.component';
import { EmpresaComponentesComponent } from './features/empresa/empresa-componentes/empresa-componentes.component';
import { DisenoPublicoComponent } from './features/empresa/diseno-publico/diseno-publico.component';
import { EspacioPublicoComponent } from './features/empresa/espacio/espacio-publico.component';
import { EmpresaEspacioEditorComponent } from './features/empresa/espacio/empresa-espacio-editor.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { UbicacionComponent } from './features/ubicacion/ubicacion.component';
import { EmpleoComponent } from './features/empleo/empleo.component';
import { AccesoNativoComponent } from './features/auth/acceso-nativo/acceso-nativo.component';
import { accesoNativoGuard } from './core/guards/acceso-nativo.guard';

export const routes: Routes = [
  // Tarjeta de contacto pública (destino del QR / NFC)
  { path: 'tarjeta/:userId/:slug', component: TarjetaPublicaComponent },
  { path: 'tarjeta/:userId', component: TarjetaPublicaComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [accesoNativoGuard],

    children: [
      {
        path: '',
        component: NfcProfileComponent,
        canActivate: [publicGuard],
        pathMatch: 'full'
      },
      { path: 'proyectos', component: ProyectosComponent },
      { path: 'proyectos/:username', component: ProyectosComponent }, 
      { path: 'perfil', component: PerfilComponent }, 
      { path: 'perfil/:username', component: PerfilComponent },
      { path: 'u/:username', component: InformacionPersonalComponent }, 
      { path: 'informacion-personal', component: InformacionPersonalComponent },
      { path: 'politicas', component: PoliticasComponent }
    ]
  },
  

  { path: 'oauth2/callback', component: OAuthCallbackComponent },

  { path: 'acceso', component: AccesoNativoComponent, canActivate: [publicGuard] },

  // Página propia de un diseño público (menú, tarjeta, catálogo…)
  { path: 'diseno/:slug', component: DisenoPublicoComponent },
  { path: 'empresa/:slug', component: EmpresaPublicaComponent, canActivate: [authGuard] },
  { path: 'empresa/:slug/espacio/:espacio', component: EspacioPublicoComponent },
  // Carpeta pública de componentes de la empresa (menús, tarjetas, información...)
  { path: 'empresa/:slug/componentes', component: EmpresaComponentesComponent },
  // Enlace propio de cada componente creado en el lienzo
  { path: 'empresa/:slug/c/:componenteId', component: EmpresaComponenteComponent },

  {
    path: 'app',
    component: PrivateLayoutComponent,
    canActivate: [authGuard], 
    children: [
      { path: '', component: FeedComponent },
      { path: 'informacion-personal', component: InformacionPersonalComponent, data: { anchoCompleto: true } },
      { path: 'proyectos', component: ProyectosComponent },
      { path: 'perfil', component: PerfilComponent },
      { path: 'perfil/:username', component: PerfilComponent },
      { path: 'portafolio', component: PortafolioComponent }, 
      { path: 'hub', component: LinkHubComponent },
      { path: 'talento', component: TalentoComponent },
      { path: 'ajustes/cuenta', component: AjustesCuentaComponent },
      { path: 'ajustes/seguridad', component: AjustesSeguridadComponent },
      { path: 'dashboard', component: DashboardComponent, data: { anchoCompleto: true, ambito: 'personal' } },
      { path: 'dashboard/empresa', component: DashboardComponent, data: { anchoCompleto: true, ambito: 'empresa' } },
      { path: 'dashboard/empresa/mi-actividad', component: DashboardComponent, data: { anchoCompleto: true, ambito: 'empresa-personal' } },
      { path: 'ubicacion', component: UbicacionComponent, data: { anchoCompleto: true } },
      { path: 'empleo', component: EmpleoComponent, data: { anchoCompleto: true } },
      { path: 'empresa', component: EmpresaDashboardComponent, data: { anchoCompleto: true } },
      { path: 'empresa/ajustes', component: EmpresaAjustesComponent },
      { path: 'empresa/lienzo', component: EmpresaLienzoComponent, data: { anchoCompleto: true } },
      { path: 'empresa/espacio', component: EmpresaEspacioEditorComponent, data: { anchoCompleto: true } },
      { path: 'empresa/componentes', component: EmpresaComponentesComponent, data: { anchoCompleto: true } },
      { path: 'empresa/disenos', component: EmpresaComponentesComponent, data: { anchoCompleto: true } },
      {
        path: 'emisora',
        loadComponent: () => import('./features/emisora/emisora-nfc.component').then((m) => m.EmisoraNfcComponent)
      }
    ]
  },

  { path: '**', redirectTo: '' }
];