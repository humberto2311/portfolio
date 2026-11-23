import { Component, input, output, signal } from '@angular/core';
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
      [compacto]="compacto()"
      [ocultarCabecera]="ocultarCabecera()"
      [personas]="personas()"
      (cargados)="recibirGrupos($event)"
      (abrirCreador)="creador.set(true)"
      (abrirChat)="abrirChat.emit($event)"
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
  readonly compacto = input(false);
  readonly ocultarCabecera = input(false);
  readonly personas = input<Array<{ id: string; nombre: string; avatar?: string | null }>>([]);
  readonly abrirChat = output<{ id: string; nombre: string; avatar: string | null }>();

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
