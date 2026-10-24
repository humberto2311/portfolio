import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { HomeComponent } from './features/home/home.component';
import { InformacionPersonalComponent } from './features/informacion-personal/informacion-personal.component';
import { ProyectosComponent } from './features/proyectos/proyectos.component';
import { NfcProfileComponent } from './shared/components/nfc-profile/nfc-profile.component';

// Asegúrate de importar tu componente de Login (ajusta la ruta)
// import { LoginComponent } from './features/auth/login/login.component';

export const routes: Routes = [
  // 1. RUTAS CON NAVBAR Y FOOTER (Dentro del Layout)
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: NfcProfileComponent },
      { path: 'informacion-personal', component: InformacionPersonalComponent },
      { path: 'proyectos', component: ProyectosComponent }
    ]
  },

  // 2. RUTAS SIN NAVBAR NI FOOTER (Fuera del Layout)
  // { path: 'login', component: LoginComponent }, // <-- DESCOMENTA CUANDO TENGAS TU COMPONENTE LOGIN

  // 3. Redirección
  { path: '**', redirectTo: '' }
];