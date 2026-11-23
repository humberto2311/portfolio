import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnaliticaPanel, HojaExportacion, SerieAnalitica } from '../../core/models/analitica.model';
import { AnaliticaService } from '../../core/services/analitica.service';
import { EmpresaService } from '../../core/services/empresa.service';
import { DashboardGraficoComponent } from './dashboard-grafico.component';
import { DatosDashboard, SerieDashboard, TarjetaDashboard, TipoGrafico } from './dashboard.model';

const TODOS: TipoGrafico[] = ['barras', 'columnas', 'lineas', 'area', 'torta'];

@Component({
  selector: 'app-panel-analitica',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardGraficoComponent],
  templateUrl: './panel-analitica.component.html',
  styleUrls: ['./panel-analitica.component.scss']
})
export class PanelAnaliticaComponent implements OnInit {

  private analitica = inject(AnaliticaService);
  private empresas = inject(EmpresaService);

  readonly panel = signal<AnaliticaPanel | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly desde = signal('');
  readonly hasta = signal('');
  readonly contexto = signal<'personal' | 'empresa'>('personal');
  readonly selectorAbierto = signal(false);
  readonly exportando = signal(false);
  readonly exportado = signal<HojaExportacion | null>(null);

  readonly empresasDisponibles = computed(() => this.empresas.listado());
  readonly empresaActiva = computed(() => this.empresas.empresaActual());
  readonly puedeVerEmpresa = computed(() => {
    const rol = this.empresaActiva()?.rolPropio ?? null;
    return rol === 'ADMIN' || rol === 'EDITOR' || rol === 'LECTOR';
  });

  readonly datos = computed<DatosDashboard>(() => {
    const panel = this.panel();
    if (!panel) {
      return { contexto: 'personal', titulo: 'Mi panel', subtitulo: 'Cargando…', metricas: [], tarjetas: [] };
    }

    return {
      contexto: panel.contexto,
      titulo: panel.titulo,
      subtitulo: panel.subtitulo,
      metricas: panel.metricas.map((metrica) => ({
        clave: metrica.clave,
        etiqueta: metrica.etiqueta,
        valor: metrica.valor,
        icono: metrica.icono
      })),
      tarjetas: this.tarjetas(panel)
    };
  });

  ngOnInit(): void {
    this.contexto.set(this.empresaActiva() ? 'empresa' : 'personal');
    this.empresas.cargarMis().subscribe({
      next: () => {
        this.contexto.set(this.empresaActiva() ? 'empresa' : 'personal');
        this.cargar();
      },
      error: () => this.cargar()
    });
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    const empresaId = this.contexto() === 'empresa' ? this.empresaActiva()?.id ?? null : null;

    this.analitica.panel(empresaId, this.desde() || undefined, this.hasta() || undefined).subscribe({
      next: (panel) => {
        this.panel.set(panel);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(err?.error?.error ?? 'No se pudo cargar el panel.');
      }
    });
  }

  cambiarContexto(contexto: 'personal' | 'empresa'): void {
    this.contexto.set(contexto);
    this.selectorAbierto.set(false);
    this.cargar();
  }

  alternarSelector(): void {
    this.selectorAbierto.update((valor) => !valor);
  }

  exportar(): void {
    const empresaId = this.contexto() === 'empresa' ? this.empresaActiva()?.id ?? null : null;
    this.exportando.set(true);

    this.analitica.exportarContactos(empresaId, this.desde() || undefined, this.hasta() || undefined).subscribe({
      next: (hoja) => {
        this.exportado.set(hoja);
        this.exportando.set(false);
      },
      error: () => {
        this.exportando.set(false);
        this.error.set('No se pudo preparar la exportación.');
      }
    });
  }

  descargarCsv(): void {
    const hoja = this.exportado();
    if (!hoja) return;

    const filas = [hoja.encabezados, ...hoja.filas].map((fila) =>
      fila.map((celda) => `"${String(celda ?? '').replace(/"/g, '""')}"`).join(',')
    );

    const blob = new Blob([filas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `${hoja.titulo.toLowerCase().replace(/\s+/g, '-')}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  private tarjetas(panel: AnaliticaPanel): TarjetaDashboard[] {
    const tarjetas: TarjetaDashboard[] = [
      this.tarjeta('visitas-dia', 'Visitas por día', 'Periodo seleccionado', 'area', panel.visitasPorDia),
      this.tarjeta('origen', 'De dónde llegan', 'Canal de entrada', 'torta', panel.origenes),
      this.tarjeta('enlaces', 'Clics en enlaces', 'Enlaces más abiertos', 'barras', panel.clicsEnlaces)
    ];

    if (panel.contexto === 'empresa' && panel.rendimientoEmpleados.length > 0) {
      tarjetas.push(this.tarjeta('equipo', 'Rendimiento del equipo', 'Eventos por empleado', 'barras', panel.rendimientoEmpleados));
    }

    return tarjetas.filter((tarjeta) => tarjeta.series.length > 0);
  }

  private tarjeta(id: string, titulo: string, descripcion: string, tipo: TipoGrafico,
                  series: SerieAnalitica[]): TarjetaDashboard {

    return {
      id,
      titulo,
      descripcion,
      tipoGrafico: tipo,
      permitidos: TODOS,
      series: series.map((serie): SerieDashboard => ({ etiqueta: serie.etiqueta, valor: serie.valor }))
    };
  }
}
