import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { EmpresaService } from '../../core/services/empresa.service';
import { DashboardGraficoComponent } from './dashboard-grafico.component';
import {
  CONEXIONES_RECIENTES,
  DASHBOARD_EMPLEADO,
  DASHBOARD_EMPRESA,
  DASHBOARD_PERSONAL,
  SUGERENCIAS_NETWORKING,
} from './dashboard.demo';
import {
  ConexionReciente,
  DatosDashboard,
  ETIQUETAS_CONEXION,
  EtiquetaConexion,
} from './dashboard.model';

type Ambito = 'personal' | 'empresa' | 'empresa-personal';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, DashboardGraficoComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private empresas = inject(EmpresaService);

  readonly ambito = signal<Ambito>('personal');
  readonly selectorAbierto = signal(false);
  readonly filtroNombre = signal('');
  readonly filtroDesde = signal('');
  readonly filtroHasta = signal('');

  readonly sugerencias = SUGERENCIAS_NETWORKING;
  readonly etiquetas = ETIQUETAS_CONEXION;
  readonly conexiones = signal<ConexionReciente[]>(CONEXIONES_RECIENTES);

  readonly datos = computed<DatosDashboard>(() => {
    switch (this.ambito()) {
      case 'empresa':
        return DASHBOARD_EMPRESA;
      case 'empresa-personal':
        return DASHBOARD_EMPLEADO;
      default:
        return DASHBOARD_PERSONAL;
    }
  });

  readonly empresasDisponibles = computed(() => this.empresas.listado());

  get empresaActiva() {
    return this.empresas.empresaActual();
  }

  get nombrePersona(): string {
    return this.auth.currentUser()?.fullName ?? 'Tu perfil';
  }

  get esAmbitoEmpresa(): boolean {
    return this.ambito() !== 'personal';
  }

  get conexionesFiltradas(): ConexionReciente[] {
    const nombre = this.filtroNombre().trim().toLowerCase();
    const desde = this.filtroDesde();
    const hasta = this.filtroHasta();

    return this.conexiones().filter((conexion) => {
      const coincideNombre = nombre
        ? `${conexion.persona} ${conexion.empresa}`.toLowerCase().includes(nombre)
        : true;

      const coincideDesde = desde ? conexion.ultimoToque >= desde : true;
      const coincideHasta = hasta ? conexion.ultimoToque <= hasta : true;

      return coincideNombre && coincideDesde && coincideHasta;
    });
  }

  get totalToques(): number {
    return this.conexionesFiltradas.reduce((suma, conexion) => suma + conexion.toques, 0);
  }

  get toquesNfc(): number {
    return this.conexionesFiltradas
      .filter((conexion) => conexion.medio === 'NFC')
      .reduce((suma, conexion) => suma + conexion.toques, 0);
  }

  get toquesQr(): number {
    return this.conexionesFiltradas
      .filter((conexion) => conexion.medio === 'QR')
      .reduce((suma, conexion) => suma + conexion.toques, 0);
  }

  ngOnInit(): void {
    this.ambito.set((this.route.snapshot.data['ambito'] as Ambito) ?? 'personal');
    this.empresas.cargarMis().subscribe();
  }

  alternarSelector(): void {
    this.selectorAbierto.update((valor) => !valor);
  }

  elegirEmpresa(id: string): void {
    this.empresas.entrar(id);
    this.selectorAbierto.set(false);
  }

  limpiarFiltros(): void {
    this.filtroNombre.set('');
    this.filtroDesde.set('');
    this.filtroHasta.set('');
  }

  cambiarEtiqueta(conexion: ConexionReciente, etiqueta: string): void {
    this.conexiones.update((lista) =>
      lista.map((item) =>
        item.id === conexion.id ? { ...item, etiqueta: etiqueta as EtiquetaConexion } : item,
      ),
    );
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
