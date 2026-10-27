import { Routes } from '@angular/router';

export const PERFIL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../perfil.component').then(m => m.PerfilComponent)
  }
];