import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';

import { BusquedaEmpleo, GraficoCv, Vacante } from '../../core/models/empleo.model';
import { EmpleoService } from '../../core/services/empleo.service';
import { EmpleoChatComponent } from './empleo-chat.component';
import { EmpleoGraficoComponent, TipoGraficoEmpleo } from './empleo-grafico.component';

@Component({
  selector: 'app-empleo',
  standalone: true,
  imports: [CommonModule, FormsModule, EmpleoGraficoComponent, EmpleoChatComponent, RouterLink, RouterLinkActive],
  templateUrl: './empleo.component.html',
  styleUrls: ['./empleo.component.scss'],
})
export class EmpleoComponent implements OnInit {
  private svc = inject(EmpleoService);
  private ruta = inject(ActivatedRoute);

  readonly termino = signal('');
  readonly ciudad = signal('');
  readonly modalidad = signal('');
  readonly buscando = signal(false);
  readonly cargandoGrafico = signal(true);
  readonly error = signal<string | null>(null);

  readonly grafico = signal<GraficoCv | null>(null);
  readonly busqueda = signal<BusquedaEmpleo | null>(null);
  readonly historial = signal<BusquedaEmpleo[]>([]);
  readonly detalle = signal<Vacante | null>(null);
  readonly filtroIa = signal(false);
  readonly tipoGrafico = signal<TipoGraficoEmpleo>('barras');
  readonly descartadas = signal<string[]>([]);

  readonly modalidades = ['', 'Remoto', 'Híbrido', 'Presencial'];

  readonly iaDisponible = computed(() => this.grafico() !== null);

  ngOnInit(): void {
    this.ruta.queryParamMap.subscribe((params) => {
      const clave = params.get('vacante');
      if (clave) {
        this.abrirPorEnlace(clave);
      }
    });

    // 1. El gráfico del CV va primero, sin filtros y sin scraping.
    this.cargarGrafico();

    // 2. Historial de búsquedas guardadas.
    this.svc.historial().subscribe((lista) => this.historial.set(lista));
  }

  cargarGrafico(): void {
    this.cargandoGrafico.set(true);

    this.svc.grafico().subscribe({
      next: (resultado) => {
        this.cargandoGrafico.set(false);
        this.grafico.set(resultado?.grafico ?? null);
        // El gráfico ya trae el aviso del CV; la lista de vacantes llega con la búsqueda.
        if (resultado?.grafico?.titular && !this.termino()) {
          this.termino.set(resultado.grafico.titular);
        }
      },
      error: (err) => {
        this.cargandoGrafico.set(false);
        this.grafico.set(null);
        this.error.set(err?.error?.error ?? null);
      },
    });
  }

  buscar(): void {
    const termino = this.termino().trim();
    if (!termino) {
      this.error.set('Escribe el cargo o la tecnología que buscas.');
      return;
    }

    this.buscando.set(true);
    this.error.set(null);

    this.svc.buscar(termino, this.ciudad().trim(), this.modalidad(), this.filtroIa()).subscribe({
      next: (resultado) => {
        this.buscando.set(false);
        this.busqueda.set(resultado);
        this.descartadas.set([]);
        this.detalle.set(null);

        // El gráfico se refresca con el cruce contra el mercado
        if (resultado?.grafico) {
          this.grafico.set(resultado.grafico);
        }

        this.svc.historial().subscribe((lista) => this.historial.set(lista));
      },
      error: (err) => {
        this.buscando.set(false);
        this.error.set(err?.error?.error ?? 'No se pudo completar la búsqueda.');
      },
    });
  }

  get resultados(): Vacante[] {
    const lista = this.busqueda()?.resultados ?? [];
    const descartes = new Set(this.descartadas());

    return lista
      .filter((vacante) => !descartes.has(this.clave(vacante)))
      .sort((a, b) => (b.puntaje ?? 0) - (a.puntaje ?? 0));
  }

  get mejor(): Vacante | null {
    return this.resultados[0] ?? null;
  }

  get recomendaciones(): string[] {
    return this.grafico()?.recomendaciones ?? [];
  }

  /** Vacantes que alimentan el gráfico general. */
  get vacantesVisibles(): Vacante[] {
    return this.resultados;
  }

  get indiceGeneral(): number {
    return this.grafico()?.indiceGeneral ?? 0;
  }

  get aniosExperiencia(): number {
    return this.grafico()?.aniosExperiencia ?? 0;
  }

  clave(vacante: Vacante): string {
    return vacante.enlace ?? `${vacante.cargo}|${vacante.empresa}`;
  }

  descartar(vacante: Vacante): void {
    this.descartadas.update((lista) => [...lista, this.clave(vacante)]);
    if (this.detalle() && this.clave(this.detalle() as Vacante) === this.clave(vacante)) {
      this.detalle.set(null);
    }
  }

  abrirPorEnlace(enlace: string): void {
    const lista = this.busqueda()?.resultados ?? [];
    const encontrada = lista.find((vacante) => vacante.enlace === enlace);

    if (encontrada) {
      this.detalle.set(encontrada);
      return;
    }

    if (this.buscando() || this.cargandoGrafico()) {
      setTimeout(() => this.abrirPorEnlace(enlace), 300);
    }
  }

  ver(vacante: Vacante): void {
    this.detalle.set(this.detalle()?.enlace === vacante.enlace ? null : vacante);
  }

  abrir(vacante: Vacante): void {
    this.abrirEnlace(vacante.enlace);
  }

  abrirEnlace(enlace: string | null | undefined): void {
    if (enlace) window.open(enlace, '_blank', 'noopener');
  }

  usarHistorial(item: BusquedaEmpleo): void {
    this.termino.set(item.termino);
    this.ciudad.set(item.ciudad ?? '');
    this.modalidad.set(item.modalidad ?? '');
    this.busqueda.set(item);
    this.descartadas.set([]);
    this.detalle.set(null);
  }

  nivel(puntaje: number): 'alta' | 'media' | 'baja' {
    if (puntaje >= 70) return 'alta';
    if (puntaje >= 45) return 'media';
    return 'baja';
  }

  fecha(valor: string | null | undefined): string {
    if (!valor) return '';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return '';
    return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
