import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstadosCarruselComponent } from './estados-carrusel.component';
import { EstadosCreadorComponent } from './estados-creador.component';
import { EstadosVisorComponent } from './estados-visor.component';
import { GrupoEstados } from '../../core/models/estado.model';

@Component({
  selector: 'app-estados',
  standalone: true,
  imports: [CommonModule, EstadosCarruselComponent, EstadosCreadorComponent, EstadosVisorComponent],
  template: `
    <app-estados-carrusel
      [recarga]="recarga()"
      (abrirCreador)="creador.set(true)"
      (abrirVisor)="visor.set($event)" />

    @if (creador()) {
      <app-estados-creador (cerrar)="creador.set(false)" (publicado)="publicado()" />
    }

    @if (visor(); as grupo) {
      <app-estados-visor
        [grupo]="grupo"
        (cerrar)="visor.set(null)"
        (borrado)="publicado()" />
    }
  `
})
export class EstadosComponent {

  readonly creador = signal(false);
  readonly visor = signal<GrupoEstados | null>(null);
  readonly recarga = signal(0);

  publicado(): void {
    this.creador.set(false);
    this.visor.set(null);
    this.recarga.set(this.recarga() + 1);
  }
}
