import { Component, input, signal } from '@angular/core';
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
      [soloTextoYAudio]="soloTextoYAudio()"
      (cargados)="recibirGrupos($event)"
      (abrirCreador)="creador.set(true)"
      (abrirVisor)="abrirVisor($event)" />

    @if (creador()) {
      <app-estados-creador (cerrar)="creador.set(false)" (publicado)="publicado()" />
    }

    @if (visor(); as grupo) {
      <app-estados-visor
        [grupo]="grupo"
        [vecinos]="gruposVisor()"
        (cerrar)="visor.set(null)"
        (borrado)="publicado()" />
    }
  `
})
export class EstadosComponent {

  readonly soloTextoYAudio = input(false);

  readonly creador = signal(false);
  readonly visor = signal<GrupoEstados | null>(null);
  readonly recarga = signal(0);
  readonly gruposVisor = signal<GrupoEstados[]>([]);

  abrirVisor(grupo: GrupoEstados): void {
    this.visor.set(grupo);
  }

  recibirGrupos(grupos: GrupoEstados[]): void {
    this.gruposVisor.set(grupos);
  }

  publicado(): void {
    this.creador.set(false);
    this.visor.set(null);
    this.recarga.set(this.recarga() + 1);
  }
}
