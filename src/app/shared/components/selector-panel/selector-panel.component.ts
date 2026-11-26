import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { EmpresaService } from '../../../core/services/empresa.service';

/**
 * El botón desplegable de arriba: Mi panel · Empresa · Mi actividad · Buscar empleo.
 * Vive en un solo componente para que se vea igual en todas las pantallas y nunca
 * se quede sin salida cuando cambias de modo.
 */
@Component({
  selector: 'app-selector-panel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './selector-panel.component.html',
  styleUrls: ['./selector-panel.component.scss'],
})
export class SelectorPanelComponent {
  private router = inject(Router);
  private empresas = inject(EmpresaService);

  readonly abierto = signal(false);
  readonly enEmpresa = this.empresas.enModoEmpresa;
  readonly empresaActiva = computed(() => this.empresas.empresaActual());
  readonly empresasDisponibles = computed(() => this.empresas.listado());

  get ruta(): string {
    return this.router.url.split('?')[0];
  }

  get titulo(): string {
    if (this.ruta.startsWith('/app/empleo')) return 'Buscar empleo';
    if (this.ruta.startsWith('/app/panel')) {
      return this.ruta.includes('mi-actividad') ? 'Mi actividad' : 'Mi panel';
    }
    return this.enEmpresa() ? 'Empresa' : 'Mi panel';
  }

  alternar(): void {
    this.abierto.update((valor) => !valor);
  }

  cerrar(): void {
    this.abierto.set(false);
  }

  entrarEmpresa(id: string): void {
    this.empresas.entrar(id);
    this.cerrar();
    this.router.navigate(['/app/panel'], { queryParams: { ambito: 'empresa' } });
  }

  salirEmpresa(): void {
    this.empresas.salir();
    this.cerrar();
    this.router.navigate(['/app/panel'], { queryParams: { ambito: 'personal' } });
  }

  @HostListener('document:click', ['$event'])
  cerrarAlClicFuera(evento: MouseEvent): void {
    if (!(evento.target as HTMLElement)?.closest('.selector-panel')) {
      this.abierto.set(false);
    }
  }
}
