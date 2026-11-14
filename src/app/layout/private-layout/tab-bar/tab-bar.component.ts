import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfileService } from '../../../core/services/user-profile.service';
import { SidePanelService } from '../../../core/services/side-panel.service';
import { EmpresaService } from '../../../core/services/empresa.service';

interface Destino {
  label: string;
  icon: string;
  ruta?: string;
  exacto?: boolean;
  accion?: 'salir';
}

@Component({
  selector: 'app-tab-bar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './tab-bar.component.html',
  styleUrls: ['./tab-bar.component.scss'],
})
export class TabBarComponent {
  private router = inject(Router);
  private auth = inject(AuthService);
  private perfiles = inject(UserProfileService);
  private mensajes = inject(SidePanelService);
  readonly empresa = inject(EmpresaService);

  readonly user = this.auth.currentUser;
  readonly avatar = this.perfiles.avatar;
  readonly hoja = signal(false);

  get extras(): Destino[] {
    if (this.empresa.enModoEmpresa()) {
      const actual = this.empresa.empresaActual();
      return [
        { label: 'Perfil en la red (lo que ven los demás)', icon: 'fa-solid fa-building', ruta: '/app/empresa' },
        { label: 'Mi espacio (tu landing)', icon: 'fa-solid fa-globe', ruta: '/app/empresa/espacio' },
        { label: 'Diseño (armar secciones)', icon: 'fa-solid fa-pen-ruler', ruta: '/app/empresa/lienzo' },
        { label: 'Mis diseños (componentes)', icon: 'fa-solid fa-folder-open', ruta: '/app/empresa/disenos' },
        { label: 'Panel de la empresa', icon: 'fa-solid fa-chart-pie', ruta: '/app/dashboard/empresa' },
        { label: 'Equipo de la empresa', icon: 'fa-solid fa-users', ruta: '/app/empresa/ajustes?tab=equipo' },
        { label: 'Ajustes de la empresa', icon: 'fa-solid fa-gear', ruta: '/app/empresa/ajustes' },
        ...(actual
          ? [{ label: 'Ver página pública', icon: 'fa-solid fa-globe', ruta: `/empresa/${actual.slug}` }]
          : []),
        { label: 'Volver a mi perfil personal', icon: 'fa-solid fa-user', accion: 'salir' },
      ];
    }

    return [
      { label: 'Mi panel', icon: 'fa-solid fa-chart-pie', ruta: '/app/dashboard' },
      { label: 'Mapa de conexiones', icon: 'fa-solid fa-map-location-dot', ruta: '/app/ubicacion' },
      { label: 'Portafolio', icon: 'fa-solid fa-briefcase', ruta: '/app/portafolio' },
      { label: 'Proyectos', icon: 'fa-solid fa-diagram-project', ruta: '/app/proyectos' },
      { label: 'Mis enlaces', icon: 'fa-solid fa-link', ruta: '/app/hub' },
      { label: 'Hoja de vida', icon: 'fa-solid fa-file-lines', ruta: '/app/informacion-personal' },
      ...(Capacitor.isNativePlatform()
        ? [{ label: 'Emitir por NFC', icon: 'fa-solid fa-tower-broadcast', ruta: '/app/emisora' }]
        : []),
      { label: 'Ajustes de cuenta', icon: 'fa-solid fa-gear', ruta: '/app/ajustes/cuenta' },
      { label: 'Seguridad', icon: 'fa-solid fa-shield-halved', ruta: '/app/ajustes/seguridad' },
    ];
  }

  iniciales(): string {
    const nombre = this.user()?.fullName ?? '';
    return nombre.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'U';
  }

  alternarHoja(): void {
    this.hoja.update((v) => !v);
  }

  cerrarHoja(): void {
    this.hoja.set(false);
  }

  ir(ruta: string): void {
    this.cerrarHoja();
    this.router.navigate([ruta]);
  }

  abrirMensajes(): void {
    this.cerrarHoja();
    this.mensajes.openContacts();
  }

  salirEmpresa(): void {
    this.cerrarHoja();
    this.empresa.salir();
    this.router.navigate(['/app']);
  }

  logout(): void {
    this.cerrarHoja();
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
