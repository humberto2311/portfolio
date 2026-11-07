import { Component, HostListener, inject, signal, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { ModalService } from '../../../core/services/modal.service';
import { TemaService } from '../../../core/services/tema.service';
import { LogoComponent } from '../logo/logo.component';

interface SeccionLanding {
  id: string;
  etiqueta: string;
  detalle: string;
  icono: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, LogoComponent],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  private readonly modalSvc = inject(ModalService);
  private readonly router = inject(Router);
  private readonly plataforma = inject(PLATFORM_ID);
  readonly tema = inject(TemaService);

  readonly usuarioCreador = 'humberto2311';

  readonly secciones: SeccionLanding[] = [
    { id: 'que-es', etiqueta: 'Qué es', detalle: 'La idea detrás de NFC-Soft', icono: 'fa-solid fa-circle-info' },
    { id: 'como-funciona', etiqueta: 'Cómo funciona', detalle: 'Del perfil a los contactos', icono: 'fa-solid fa-list-check' },
    { id: 'versiones', etiqueta: 'Versiones', detalle: 'Qué corre hoy y qué viene', icono: 'fa-solid fa-layer-group' }
  ];

  readonly esInicio = signal(this.router.url === '/');
  readonly isScrolled = signal(false);
  readonly isMobileMenuOpen = signal(false);
  readonly seccionActiva = signal<string | null>(null);
  readonly progreso = signal(0);

  private midiendo = false;

  constructor() {
    this.router.events.pipe(
      filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
      takeUntilDestroyed()
    ).subscribe(() => {
      this.esInicio.set(this.router.url === '/');
      this.isMobileMenuOpen.set(false);
      this.medir();
    });
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (!this.hayNavegador()) {
      return;
    }
    this.isScrolled.set(window.scrollY > 16);
    if (this.midiendo) {
      return;
    }
    this.midiendo = true;
    requestAnimationFrame(() => {
      this.midiendo = false;
      this.medir();
    });
  }

  alternarTema(): void {
    this.tema.alternar();
    this.cerrarMenu();
  }

  alternarMenu(): void {
    this.isMobileMenuOpen.update((abierto) => !abierto);
  }

  cerrarMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  abrirLogin(tab: 'login' | 'register' = 'login'): void {
    this.cerrarMenu();
    this.modalSvc.openLogin(tab);
  }

  irA(seccion: SeccionLanding): void {
    this.cerrarMenu();
    if (this.esInicio()) {
      this.desplazar(seccion.id);
      return;
    }
    this.router.navigate(['/']).then(() => this.desplazar(seccion.id));
  }

  private desplazar(id: string): void {
    if (!this.hayNavegador()) {
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private medir(): void {
    if (!this.hayNavegador()) {
      return;
    }
    const documento = document.documentElement;
    const restante = documento.scrollHeight - window.innerHeight;
    this.progreso.set(restante > 40 ? Math.min(100, Math.max(0, (window.scrollY / restante) * 100)) : 0);

    if (!this.esInicio()) {
      this.seccionActiva.set(null);
      return;
    }

    let activa: string | null = null;
    for (const seccion of this.secciones) {
      const elemento = document.getElementById(seccion.id);
      if (elemento && elemento.getBoundingClientRect().top <= 160) {
        activa = seccion.id;
      }
    }
    this.seccionActiva.set(activa);
  }

  private hayNavegador(): boolean {
    return isPlatformBrowser(this.plataforma);
  }
}
