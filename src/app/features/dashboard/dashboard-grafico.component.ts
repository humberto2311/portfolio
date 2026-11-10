import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PieController,
  PointElement,
  Tooltip,
} from 'chart.js';

import { GRAFICOS, SerieDashboard, TipoGrafico } from './dashboard.model';

const PALETA = ['#38bdf8', '#22c55e', '#f59e0b', '#a855f7', '#f87171', '#14b8a6', '#eab308'];

let registrado = false;

function registrarChart(): void {
  if (registrado) return;

  Chart.register(
    BarController,
    BarElement,
    LineController,
    LineElement,
    PointElement,
    // ArcElement es obligatorio para torta y doughnut: sin él,
    // Chart.js lanza ""arc" is not a registered element".
    ArcElement,
    PieController,
    DoughnutController,
    CategoryScale,
    LinearScale,
    Filler,
    Tooltip,
    Legend,
  );

  Chart.defaults.color = '#94a3b8';
  Chart.defaults.font.family = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
  Chart.defaults.font.size = 11;
  registrado = true;
}

@Component({
  selector: 'app-dashboard-grafico',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-grafico.component.html',
  styleUrls: ['./dashboard-grafico.component.scss'],
})
export class DashboardGraficoComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) series: SerieDashboard[] = [];
  @Input() tipo: TipoGrafico = 'barras';
  @Input() permitidos: TipoGrafico[] = GRAFICOS.map((grafico) => grafico.valor);
  @Input() apilado = false;

  @ViewChild('lienzo') lienzo?: ElementRef<HTMLCanvasElement>;

  readonly seleccionado = signal<TipoGrafico | null>(null);
  readonly opciones = computed(() => GRAFICOS.filter((grafico) => this.permitidos.includes(grafico.valor)));

  private grafico: Chart | null = null;

  get activo(): TipoGrafico {
    return this.seleccionado() ?? this.tipo;
  }

  get total(): number {
    return this.series.reduce((suma, punto) => suma + punto.valor, 0);
  }

  ngAfterViewInit(): void {
    this.dibujar();
  }

  ngOnDestroy(): void {
    this.grafico?.destroy();
    this.grafico = null;
  }

  elegir(tipo: TipoGrafico): void {
    this.seleccionado.set(tipo);
    this.dibujar();
  }

  porcentaje(valor: number): string {
    return this.total ? `${Math.round((valor / this.total) * 100)}%` : '0%';
  }

  private dibujar(): void {
    const lienzo = this.lienzo?.nativeElement;
    if (!lienzo) return;

    registrarChart();
    this.grafico?.destroy();

    const etiquetas = this.series.map((punto) => punto.etiqueta);
    const valores = this.series.map((punto) => punto.valor);
    const tipo = this.activo;
    const circular = tipo === 'torta';

    this.grafico = new Chart(lienzo, {
      type: circular ? 'doughnut' : tipo === 'lineas' || tipo === 'area' ? 'line' : 'bar',
      data: {
        labels: etiquetas,
        datasets: [
          {
            label: 'Total',
            data: valores,
            backgroundColor: circular ? PALETA : 'rgba(56, 189, 248, .75)',
            borderColor: circular ? '#111a2e' : '#38bdf8',
            borderWidth: circular ? 2 : 2,
            borderRadius: circular ? 0 : 8,
            hoverBackgroundColor: circular ? PALETA : 'rgba(56, 189, 248, .95)',
            fill: tipo === 'area',
            tension: 0.35,
            pointRadius: tipo === 'lineas' || tipo === 'area' ? 3 : 0,
            pointBackgroundColor: '#38bdf8',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: tipo === 'barras' ? 'y' : 'x',
        cutout: circular ? '58%' : undefined,
        plugins: {
          legend: { display: circular, position: 'right', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } },
          tooltip: {
            callbacks: {
              label: (contexto) => {
                const valor = Number(contexto.parsed.y ?? contexto.parsed.x ?? contexto.parsed);
                return ` ${valor} (${this.porcentaje(valor)})`;
              },
            },
          },
        },
        scales: circular
          ? {}
          : {
              x: { grid: { color: 'rgba(148, 163, 184, .12)' }, ticks: { maxRotation: 0 } },
              y: {
                beginAtZero: true,
                stacked: this.apilado,
                grid: { color: 'rgba(148, 163, 184, .12)' },
              },
            },
      },
    });
  }
}
