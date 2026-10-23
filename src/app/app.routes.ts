import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { HomeComponent } from './features/home/home.component';
import { InformacionPersonalComponent } from './features/informacion-personal/informacion-personal.component';
import {ProyectosComponent} from './features/proyectos/proyectos.component';
export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', component: HomeComponent },
      { path: 'informacion-personal', component: InformacionPersonalComponent },
      { path: 'proyectos', component: ProyectosComponent }
    ]
  },
  // rutas sin navbar/footer (ej. login) van aquí afuera
  { path: '**', redirectTo: '' }
    
];
