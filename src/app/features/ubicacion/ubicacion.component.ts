import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MapaRealComponent } from '../../shared/components/mapa-real/mapa-real.component';
import { MapillaryComponent } from '../../shared/components/mapillary/mapillary.component';

import { AuthService } from '../../core/services/auth.service';
import { EmpresaService } from '../../core/services/empresa.service';
import {
  CIUDADES_DEMO,
  LOCALES_DEMO,
  LocalRegistrado,
  SECTORES,
  TOQUES_DEMO,
  TipoConexion,
  ToqueUbicacion,
} from './ubicacion.model';

type Medio = 'TODOS' | 'NFC' | 'QR';

@Component({
  selector: 'app-ubicacion',
  standalone: true,
  imports: [CommonModule, FormsModule, MapaRealComponent, MapillaryComponent],
  templateUrl: './ubicacion.component.html',
  styleUrls: ['./ubicacion.component.scss'],
})
export class UbicacionComponent implements AfterViewInit {
  @ViewChild(MapaRealComponent) mapa?: MapaRealComponent;

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
  readonly capas = signal({ personal: true, empresarial: true, locales: true });
  readonly punto = signal({ lat: 4.6097, lng: -74.0817, zoom: 12, nombre: 'Bogotá' });
  readonly seleccionado = signal<ToqueUbicacion | null>(null);
  readonly localActivo = signal<LocalRegistrado | null>(null);
  readonly locales = signal<LocalRegistrado[]>(LOCALES_DEMO);
  readonly sectores = SECTORES;
  readonly busquedaLocal = signal('');
  readonly filtroSector = signal<'' | import('./ubicacion.model').SectorEmpresa>('');

  readonly ciudades = CIUDADES_DEMO;

  readonly localesVisibles = computed(() =>
    this.locales().filter((local) => {
      if (!this.capas().locales) return false;
      const texto = this.busquedaLocal().trim().toLowerCase();
      const nombre = texto
        ? `${local.nombre} ${local.servicio} ${local.sector} ${local.ciudad} ${local.lugar}`
            .toLowerCase()
            .includes(texto)
        : true;

      const sector = this.filtroSector() ? local.sector === this.filtroSector() : true;

      return nombre && sector;
    }),
  );

  get totalLocales(): number {
    return this.localesVisibles().length;
  }

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
      const capa =
        toque.tipo === 'PERSONAL' ? this.capas().personal : this.capas().empresarial;

      return nombre && desde && hasta && medio && tipo && capa;
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
    this.busquedaLocal.set('');
    this.filtroSector.set('');
    this.capas.set({ personal: true, empresarial: true, locales: true });
  }

  alternarCapa(capa: 'personal' | 'empresarial' | 'locales'): void {
    this.capas.update((actual) => ({ ...actual, [capa]: !actual[capa] }));
  }

  seleccionar(toque: ToqueUbicacion): void {
    this.localActivo.set(null);
    const mismo = this.seleccionado()?.id === toque.id;
    this.seleccionado.set(mismo ? null : toque);

    if (!mismo) {
      this.punto.set({ lat: toque.latitud, lng: toque.longitud, zoom: 16, nombre: toque.ciudad });
      this.mapa?.irA(toque.latitud, toque.longitud, 16);
    }
  }

  seleccionarLocal(local: LocalRegistrado): void {
    this.seleccionado.set(null);
    const mismo = this.localActivo()?.id === local.id;
    this.localActivo.set(mismo ? null : local);

    if (!mismo) {
      this.punto.set({ lat: local.latitud, lng: local.longitud, zoom: 17, nombre: local.nombre });
      this.mapa?.irA(local.latitud, local.longitud, 17);
    }
  }

  verPunto(lat: number, lng: number, nombre: string, zoom = 16): void {
    this.punto.set({ lat, lng, zoom, nombre });
    this.mapa?.irA(lat, lng, zoom);
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.pintarPines(), 700);
  }

  private pintarPines(): void {
    if (!this.mapa) return;

    for (const toque of this.visibles()) {
      this.mapa.marcar(
        toque.latitud,
        toque.longitud,
        `<b>${toque.persona}</b><br>${toque.ciudad} · ${toque.toques} toques`,
      );
    }

    for (const local of this.localesVisibles()) {
      this.mapa.marcar(
        local.latitud,
        local.longitud,
        `<b>${local.nombre}</b><br>${local.servicio} · ${local.ciudad}`,
      );
    }
  }

  posicionX(longitud: number): number {
    const minimo = -77.8;
    const maximo = -71.8;
    const t = (longitud - minimo) / (maximo - minimo);
    return Math.min(72, Math.max(28, 28 + t * 42));
  }

  posicionY(latitud: number): number {
    const minimo = -1.5;
    const maximo = 11.5;
    const t = (maximo - latitud) / (maximo - minimo);
    return Math.min(88, Math.max(10, 10 + t * 78));
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
