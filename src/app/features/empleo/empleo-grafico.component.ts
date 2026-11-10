import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
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
  PointElement,
  Tooltip,
} from 'chart.js';

import { Vacante } from '../../core/models/empleo.model';

export type TipoGraficoEmpleo = 'barras' | 'columnas' | 'lineas' | 'area' | 'torta';

export const TIPOS_GRAFICO: { valor: TipoGraficoEmpleo; etiqueta: string; icono: string }[] = [
  { valor: 'barras', etiqueta: 'Barras', icono: 'fa-solid fa-chart-simple' },
  { valor: 'columnas', etiqueta: 'Columnas', icono: 'fa-solid fa-chart-column' },
  { valor: 'lineas', etiqueta: 'Líneas', icono: 'fa-solid fa-chart-line' },
  { valor: 'area', etiqueta: 'Área', icono: 'fa-solid fa-chart-area' },
  { valor: 'torta', etiqueta: 'Torta', icono: 'fa-solid fa-chart-pie' },
];

const PALETA = ['#38bdf8', '#22c55e', '#f59e0b', '#a855f7', '#f87171', '#14b8a6', '#eab308', '#818cf8'];

let registrado = false;

function registrarChart(): void {
  if (registrado) return;

  Chart.register(
    BarController,
    BarElement,
    LineController,
    LineElement,
    PointElement,
    DoughnutController,
    ArcElement,
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
  selector: 'app-empleo-grafico',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empleo-grafico.component.html',
  styleUrls: ['./empleo-grafico.component.scss'],
})
export class EmpleoGraficoComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() vacantes: Vacante[] = [];
  @Input() seleccionada: Vacante | null = null;
  @Input() aniosExperiencia = 0;
  @Input() tipo: TipoGraficoEmpleo = 'barras';
  @Output() cambiarTipo = new EventEmitter<TipoGraficoEmpleo>();

  @ViewChild('lienzo') lienzo?: ElementRef<HTMLCanvasElement>;

  readonly tipos = TIPOS_GRAFICO;

  private grafico: Chart | null = null;
  private listo = false;
  private pendiente: number | null = null;
  private firma = '';

  ngAfterViewInit(): void {
    this.listo = true;
    this.programar();
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['vacantes'] || cambios['seleccionada'] || cambios['tipo']) {
      this.programar();
    }
  }

  ngOnDestroy(): void {
    if (this.pendiente !== null) {
      clearTimeout(this.pendiente);
      this.pendiente = null;
    }
    this.grafico?.destroy();
    this.grafico = null;
    this.firma = '';
  }

  get hayDatos(): boolean {
    return this.seleccionada !== null || (this.vacantes ?? []).length > 0;
  }

  get totalVacantes(): number {
    return (this.vacantes ?? []).length;
  }

  get coincidencias(): string[] {
    return this.seleccionada?.coincidencias ?? [];
  }

  get brechas(): string[] {
    return this.seleccionada?.faltantes ?? [];
  }

  get nivel(): string {
    const puntaje = this.seleccionada?.puntaje ?? 0;
    if (puntaje >= 70) return 'alta';
    if (puntaje >= 45) return 'media';
    return 'baja';
  }

  get veredicto(): string {
    const puntaje = this.seleccionada?.puntaje ?? 0;
    if (puntaje >= 85) return 'Postúlate: encajas muy bien';
    if (puntaje >= 70) return 'Vale la pena postularse';
    if (puntaje >= 45) return 'Cerca, refuerza lo que falta';
    if (puntaje > 0) return 'Lejos todavía: suma experiencia';
    return 'Sin datos para comparar';
  }

  get resumenExperiencia(): string {
    const vacante = this.seleccionada;
    if (!vacante) return '';

    const texto = `${vacante.cargo ?? ''} ${vacante.descripcion ?? ''}`.toLowerCase();
    const pedido = texto.match(/(\d{1,2})\s*(?:\+\s*)?(?:años|anos)/);
    const requeridos = pedido ? Number(pedido[1]) : 0;

    if (!requeridos) {
      return this.aniosExperiencia > 0
        ? `No exige años concretos. Tienes ${this.aniosExperiencia} en tu CV.`
        : 'No exige años concretos, pero tu CV no registra experiencia.';
    }

    if (this.aniosExperiencia >= requeridos) {
      return `Pide ${requeridos} y tienes ${this.aniosExperiencia}. Cumples.`;
    }

    return `Pide ${requeridos} y tienes ${this.aniosExperiencia}. Te faltan ${requeridos - this.aniosExperiencia}.`;
  }

  get titulo(): string {
    if (this.seleccionada) {
      return `Cercanía con: ${this.seleccionada.cargo ?? 'la vacante'}`;
    }
    return 'Cercanía de tu CV con cada convocatoria';
  }

  private programar(): void {
    if (!this.listo) return;

    if (this.pendiente !== null) {
      clearTimeout(this.pendiente);
    }

    this.pendiente = window.setTimeout(() => {
      this.pendiente = null;
      this.dibujar();
    }, 60);
  }

  private firmaActual(): string {
    const { etiquetas, valores } = this.datos();
    return `${this.tipo}|${etiquetas.join('|')}|${valores.join('|')}`;
  }

  private dibujar(): void {
    const lienzo = this.lienzo?.nativeElement;
    if (!lienzo || !this.hayDatos) return;

    const firma = this.firmaActual();
    if (firma === this.firma && this.grafico) {
      return;
    }
    this.firma = firma;

    const { etiquetas, valores } = this.datos();
    if (!etiquetas.length) return;

    const contenedor = lienzo.parentElement;

    const ancho = Math.max(220, Math.round(contenedor?.clientWidth ?? 320));
    const alto = Math.max(180, Math.round(contenedor?.clientHeight ?? 300));

    registrarChart();
    this.grafico?.destroy();

    lienzo.width = ancho;
    lienzo.height = alto;
    lienzo.style.width = `${ancho}px`;
    lienzo.style.height = `${alto}px`;

    const circular = this.tipo === 'torta';
    const esLinea = this.tipo === 'lineas' || this.tipo === 'area';

    this.grafico = new Chart(lienzo, {
      type: circular ? 'doughnut' : esLinea ? 'line' : 'bar',
      data: {
        labels: etiquetas,
        datasets: [
          {
            data: valores,
            backgroundColor: circular ? PALETA : valores.map((valor) => this.color(valor)),
            borderColor: circular ? '#0b1220' : valores.map((valor) => this.color(valor)),
            borderWidth: circular ? 2 : 2,
            borderRadius: circular ? 0 : 8,
            fill: this.tipo === 'area',
            tension: 0.35,
            pointRadius: esLinea ? 3 : 0,
            pointBackgroundColor: '#38bdf8',
          },
        ],
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        animation: false,
        resizeDelay: 200,
        indexAxis: this.tipo === 'barras' ? 'y' : 'x',
        cutout: circular ? '58%' : undefined,
        plugins: {
          legend: {
            display: circular,
            position: 'right',
            labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true },
          },
          tooltip: {
            displayColors: false,
            animation: { duration: 0 },
            padding: 10,
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 11 },
            callbacks: {
              title: (items) => {
                if (!items.length) return '';
                const indice = items[0].dataIndex;
                return this.tituloTooltip(indice);
              },
              label: (contexto) => this.lineaTooltip(contexto.dataIndex),
            },
          },
        },
        scales: circular
          ? {}
          : {
              x: {
                beginAtZero: true,
                max: 100,
                grid: { color: 'rgba(148, 163, 184, .12)' },
                ticks: { maxRotation: 0, autoSkip: false, callback: (valor) => `${valor}%` },
              },
              y: {
                beginAtZero: true,
                max: 100,
                grid: { color: 'rgba(148, 163, 184, .12)' },
                ticks: { callback: (valor) => `${valor}%` },
              },
            },
      },
    });
  }

  private datos(): { etiquetas: string[]; valores: number[] } {
    if (this.seleccionada) {
      return this.datosDetalle(this.seleccionada);
    }

    const lista = [...(this.vacantes ?? [])].sort((a, b) => (b.puntaje ?? 0) - (a.puntaje ?? 0));

    return {
      etiquetas: lista.map((vacante) => this.corto(vacante.cargo ?? 'Vacante')),
      valores: lista.map((vacante) => vacante.puntaje ?? 0),
    };
  }

  private datosDetalle(vacante: Vacante): { etiquetas: string[]; valores: number[] } {
    const coincidencias = vacante.coincidencias?.length ?? 0;
    const faltantes = vacante.faltantes?.length ?? 0;
    const total = coincidencias + faltantes;
    const cobertura = total > 0 ? Math.round((coincidencias * 100) / total) : 0;

    return {
      etiquetas: ['Cercanía global', 'Habilidades', 'Tecnologías', 'Experiencia', 'Formación'],
      valores: [
        Math.min(99, vacante.puntaje ?? 0),
        cobertura,
        cobertura,
        this.experiencia(vacante),
        Math.min(99, Math.round((vacante.puntaje ?? 0) + 10)),
      ],
    };
  }

  private experiencia(vacante: Vacante): number {
    const texto = `${vacante.cargo ?? ''} ${vacante.descripcion ?? ''}`.toLowerCase();
    const pedidos = texto.match(/(\d{1,2})\s*(?:\+\s*)?(?:años|anos)/);
    const requeridos = pedidos ? Number(pedidos[1]) : 0;
    if (!requeridos) return this.aniosExperiencia > 0 ? 60 : 20;
    return Math.min(99, Math.round((this.aniosExperiencia * 100) / requeridos));
  }

  private tituloTooltip(indice: number): string {
    if (this.seleccionada) {
      return this.detalleDe(indice)?.etiqueta ?? '';
    }

    const ordenadas = this.ordenadas();
    const vacante = ordenadas[indice];
    if (!vacante) return '';
    const empresa = vacante.empresa ? ` — ${vacante.empresa}` : '';
    return `${vacante.cargo ?? 'Vacante'}${empresa}`;
  }

  private lineaTooltip(indice: number): string {
    if (this.seleccionada) {
      const detalle = this.detalleDe(indice);
      return detalle ? `${detalle.etiqueta}: ${detalle.valor}% — ${detalle.explicacion}` : '';
    }

    const vacante = this.ordenadas()[indice];
    if (!vacante) return '';

    const puntaje = vacante.puntaje ?? 0;
    return `Cercanía con tu CV: ${puntaje}% (${this.etiquetaNivel(puntaje)})`;
  }

  private etiquetaNivel(valor: number): string {
    if (valor >= 70) return 'buena opción';
    if (valor >= 45) return 'parcial';
    return 'baja';
  }

  private ordenadas(): Vacante[] {
    return [...(this.vacantes ?? [])].sort((a, b) => (b.puntaje ?? 0) - (a.puntaje ?? 0));
  }

  private detalleDe(indice: number): { etiqueta: string; valor: number; explicacion: string } | null {
    if (!this.seleccionada) return null;

    const coincidencias = this.seleccionada.coincidencias?.length ?? 0;
    const faltantes = this.seleccionada.faltantes?.length ?? 0;
    const total = coincidencias + faltantes;
    const cobertura = total > 0 ? Math.round((coincidencias * 100) / total) : 0;

    const filas = [
      {
        etiqueta: 'Cercanía global',
        valor: Math.min(99, this.seleccionada.puntaje ?? 0),
        explicacion: 'puntaje total de la vacante frente a tu CV',
      },
      {
        etiqueta: 'Habilidades',
        valor: cobertura,
        explicacion: `cubres ${coincidencias} de ${total} tecnologías que pide`,
      },
      {
        etiqueta: 'Tecnologías',
        valor: cobertura,
        explicacion: `de las que exige, ya tienes ${coincidencias}`,
      },
      {
        etiqueta: 'Experiencia',
        valor: this.experiencia(this.seleccionada),
        explicacion: this.resumenExperiencia,
      },
      {
        etiqueta: 'Formación',
        valor: Math.min(99, Math.round((this.seleccionada.puntaje ?? 0) + 10)),
        explicacion: 'apoyo de tu formación académica registrada',
      },
    ];

    return filas[indice] ?? null;
  }

  private color(valor: number): string {
    if (valor >= 70) return 'rgba(34, 197, 94, .85)';
    if (valor >= 45) return 'rgba(245, 158, 11, .85)';
    return 'rgba(248, 113, 113, .8)';
  }

  private corto(texto: string): string {
    return texto.length > 30 ? `${texto.slice(0, 30)}…` : texto;
  }
}
