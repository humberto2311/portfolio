import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../core/services/auth.service';
import { EmpresaService } from '../../core/services/empresa.service';
import { CIUDADES_DEMO, TOQUES_DEMO, TipoConexion, ToqueUbicacion } from './ubicacion.model';

type Medio = 'TODOS' | 'NFC' | 'QR';

@Component({
  selector: 'app-ubicacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ubicacion.component.html',
  styleUrls: ['./ubicacion.component.scss'],
})
export class UbicacionComponent {
  private auth = inject(AuthService);
  private empresas = inject(EmpresaService);

  readonly nombrePersona = signal(this.auth.currentUser()?.fullName ?? 'Tu perfil');
  readonly empresaActiva = this.empresas.empresaActual;

  readonly toques = signal<ToqueUbicacion[]>(TOQUES_DEMO);
  readonly filtroNombre = signal('');
  readonly filtroDesde = signal('');
  readonly filtroHasta = signal('');
  readonly filtroMedio = signal<Medio>('TODOS');
  readonly filtroTipo = signal<'TODOS' | TipoConexion>('TODOS');
  readonly seleccionado = signal<ToqueUbicacion | null>(null);

  readonly ciudades = CIUDADES_DEMO;

  readonly visibles = computed(() =>
    this.toques().filter((toque) => {
      const texto = this.filtroNombre().trim().toLowerCase();
      const nombre = texto
        ? `${toque.persona} ${toque.empresa} ${toque.ciudad} ${toque.lugar}`.toLowerCase().includes(texto)
        : true;

      const desde = this.filtroDesde() ? toque.fecha >= this.filtroDesde() : true;
      const hasta = this.filtroHasta() ? toque.fecha <= this.filtroHasta() : true;
      const medio = this.filtroMedio() === 'TODOS' ? true : toque.medio === this.filtroMedio();
      const tipo = this.filtroTipo() === 'TODOS' ? true : toque.tipo === this.filtroTipo();

      return nombre && desde && hasta && medio && tipo;
    }),
  );

  readonly totalToques = computed(() => this.visibles().reduce((suma, toque) => suma + toque.toques, 0));
  readonly totalPersonas = computed(() => this.visibles().length);
  readonly ciudadesDistintas = computed(
    () => new Set(this.visibles().map((toque) => toque.ciudad)).size,
  );

  readonly conexionesPersonales = computed(() => this.toques().filter((toque) => toque.tipo === 'PERSONAL').length);
  readonly conexionesEmpresariales = computed(
    () => this.toques().filter((toque) => toque.tipo === 'EMPRESARIAL').length,
  );

  limpiar(): void {
    this.filtroNombre.set('');
    this.filtroDesde.set('');
    this.filtroHasta.set('');
    this.filtroMedio.set('TODOS');
    this.filtroTipo.set('TODOS');
  }

  seleccionar(toque: ToqueUbicacion): void {
    this.seleccionado.set(this.seleccionado()?.id === toque.id ? null : toque);
  }

  posicionX(longitud: number): number {
    const minimo = -79.2;
    const maximo = -66.7;
    return Math.min(97, Math.max(3, ((longitud - minimo) / (maximo - minimo)) * 100));
  }

  posicionY(latitud: number): number {
    const minimo = -4.5;
    const maximo = 12.7;
    return Math.min(97, Math.max(3, ((maximo - latitud) / (maximo - minimo)) * 100));
  }

  burbuja(toques: number): number {
    return Math.min(46, 16 + toques * 2);
  }

  iniciales(nombre: string): string {
    const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '?';
    return partes.length === 1
      ? partes[0].slice(0, 2).toUpperCase()
      : (partes[0][0] + partes[1][0]).toUpperCase();
  }

  fecha(valor: string): string {
    if (!valor) return '';
    const [anio, mes, dia] = valor.split('-');
    return `${dia}/${mes}/${anio}`;
  }
}
