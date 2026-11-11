import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { EnlaceEspacio, EspacioEmpresa } from '../../../core/models/empresa.model';
import { anclasDe, esExterno, tieneDestino, urlEnlace, urlRed } from '../espacio/espacio-ui';

@Component({
  selector: 'app-espacio-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './espacio-navbar.component.html',
  styleUrls: ['./espacio-navbar.component.scss'],
})
export class EspacioNavbarComponent {
  @Input({ required: true }) espacio!: EspacioEmpresa;
  @Input() haySesion = false;
  @Input() puedeEditar = false;
  @Input() urlPerfilEmpresa: string | null = null;

  readonly menuAbierto = signal(false);

  get urlPerfil(): string {
    return this.urlPerfilEmpresa || urlRed(this.espacio?.empresaSlug ?? '');
  }

  get iniciales(): string {
    const partes = (this.espacio?.empresaNombre ?? '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return 'E';
    return partes.length === 1
      ? partes[0].slice(0, 2).toUpperCase()
      : (partes[0][0] + partes[1][0]).toUpperCase();
  }

  get enlaces(): EnlaceEspacio[] {
    return (this.espacio?.navbar ?? []).filter((enlace) => enlace.visible !== false);
  }

  href(enlace: EnlaceEspacio): string {
    return urlEnlace(enlace, this.espacio?.empresaSlug ?? '', this.espacio?.slug ?? '');
  }

  ir(enlace: EnlaceEspacio, evento: Event): void {
    if (!this.activo(enlace) || enlace.tipo !== 'ANCLA') return;

    const destino = document.getElementById((enlace.destino ?? '').replace(/^#/, '').trim());
    if (!destino) return;

    evento.preventDefault();
    destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.cerrar();
  }

  activo(enlace: EnlaceEspacio): boolean {
    if (!tieneDestino(enlace)) return false;
    if (enlace.tipo !== 'ANCLA') return true;
    return this.anclas.has((enlace.destino ?? '').replace(/^#/, '').trim());
  }

  private get anclas(): Set<string> {
    return new Set(anclasDe(this.espacio?.secciones ?? []));
  }

  sinAccion(evento: Event): void {
    evento.preventDefault();
    evento.stopPropagation();
  }

  externo(enlace: EnlaceEspacio): boolean {
    return esExterno(enlace);
  }

  alternar(): void {
    this.menuAbierto.update((valor) => !valor);
  }

  cerrar(): void {
    this.menuAbierto.set(false);
  }
}
