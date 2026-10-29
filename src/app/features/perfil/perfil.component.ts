import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PerfilService } from '../../core/services/perfil.service';
import { AuthService } from '../../core/services/auth.service';
import { TabId } from '../../core/models/perfil.model';

import { PerfilHeaderComponent } from './components/perfil-header/perfil-header.component';
import { PerfilTabsComponent } from './components/perfil-tabs/perfil-tabs.component';
import { TabPublicacionesComponent } from './components/tab-publicaciones/tab-publicaciones.component';
import { TabInformacionComponent } from './components/tab-informacion/tab-informacion.component';
import { TabFotosComponent } from './components/tab-fotos/tab-fotos.component';
import { TabContactosComponent } from './components/tab-contactos/tab-contactos.component';
import { ToastComponent } from './components/toast/toast.component';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    PerfilHeaderComponent,
    PerfilTabsComponent,
    TabPublicacionesComponent,
    TabInformacionComponent,
    TabFotosComponent,
    TabContactosComponent,
    ToastComponent,
    TabContactosComponent 
  ],
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.scss']
})
export class PerfilComponent implements OnInit {
  private perfilService = inject(PerfilService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);


  perfil = this.perfilService.perfil;
  cargando = this.perfilService.cargando;

  seccionActiva: TabId = 'publicaciones';
  esMiPerfil = false;

  errorCarga: string | null = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const usernameUrl = params.get('username');
      const estaLogueado = this.authService.isAuthenticated();

      
      if (usernameUrl) {
        this.errorCarga = null;
        this.perfilService.cargarPerfil(usernameUrl).subscribe({
          next: () => this.evaluarPropietario(),
          error: (err) => this.manejarError(err, usernameUrl)
        });
        return;
      }

     
      if (!estaLogueado) {
        this.router.navigate(['/']); // o a '/login'
        return;
      }

      this.errorCarga = null;
      this.perfilService.cargarPerfil(null).subscribe({
        next: () => this.evaluarPropietario(),
        error: (err) => this.manejarError(err, null)
      });
    });
  }

  private manejarError(err: any, usernameUrl: string | null): void {
    console.error('❌ [PERFIL COMPONENT] Error al cargar perfil:', err);

    if (err?.status === 401) {
      this.errorCarga = 'No autorizado. Inicia sesión para ver este perfil.';
      if (!usernameUrl) {
        this.router.navigate(['/']); 
      }
      return;
    }

    if (err?.status === 404) {
      this.errorCarga = 'El perfil no existe.';
      return;
    }

    this.errorCarga = 'Hubo un problema de conexión con el servidor.';
  }

  private evaluarPropietario(): void {
    const p = this.perfil();
    const currentUser = this.authService.currentUser();

    if (p && currentUser) {
      this.esMiPerfil = currentUser.email === p.contacto.email;
    } else {
      this.esMiPerfil = false;
    }
  }

  cambiarSeccion(tab: TabId): void {
    this.seccionActiva = tab;
  }

  irAHojaDeVida(): void {
    const p = this.perfil();
    if (!p) return;

    if (this.esMiPerfil) {
      this.router.navigate(['/app/informacion-personal']);
    } else {
      this.router.navigate([`/u/${p.id}`]);
    }
  }

  irAProyectos(): void {
    const p = this.perfil();
    if (!p) return;

    if (this.esMiPerfil) {
      this.router.navigate(['/app/proyectos']);
    } else {
      this.router.navigate([`/proyectos/${p.id}`]);
    }
  }
}