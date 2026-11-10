import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, of, switchMap } from 'rxjs';

import { Vacante } from '../../../core/models/empleo.model';
import { EmpleoService } from '../../../core/services/empleo.service';
import { MapaService, UbicacionEmpresa } from '../../../core/services/mapa.service';

export interface VacanteUbicada {
  vacante: Vacante;
  lat: number;
  lng: number;
  ciudad: string;
  direccion: string;
  fuente: string;
}

@Component({
  selector: 'app-empleo-mapa',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './empleo-mapa.component.html',
  styleUrls: ['./empleo-mapa.component.scss'],
})
export class EmpleoMapaComponent implements OnInit {
  private empleo = inject(EmpleoService);
  private mapa = inject(MapaService);

  @Output() ubicar = new EventEmitter<VacanteUbicada>();
  @Output() ubicarTodas = new EventEmitter<VacanteUbicada[]>();

  readonly vacantes = signal<Vacante[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly busqueda = signal('');
  readonly seleccionada = signal<string | null>(null);
  readonly ubicando = signal(false);

  readonly total = computed(() => this.vacantes().length);

  readonly visibles = computed<Vacante[]>(() => {
    const texto = this.busqueda().trim().toLowerCase();

    return this.vacantes()
      .filter((vacante) =>
        texto
          ? `${vacante.cargo} ${vacante.empresa} ${vacante.ubicacion} ${vacante.portal}`
              .toLowerCase()
              .includes(texto)
          : true,
      )
      .sort((a, b) => (b.puntaje ?? 0) - (a.puntaje ?? 0));
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.empleo
      .ultima()
      .pipe(catchError(() => of(null)))
      .subscribe((respuesta) => {
        this.cargando.set(false);

        if (!respuesta || !respuesta.resultados?.length) {
          this.error.set('Todavía no hay una búsqueda de empleo guardada.');
          return;
        }

        this.vacantes.set(respuesta.resultados);
      });
  }

  elegir(vacante: Vacante): void {
    this.seleccionada.set(vacante.enlace ?? vacante.cargo);
    this.ubicando.set(true);

    const ciudad = vacante.ubicacion ?? '';

    this.mapa
      .ubicacionEmpresa(vacante.empresa ?? '', ciudad)
      .pipe(
        catchError(() =>
          of({
            empresa: vacante.empresa ?? '',
            ciudad,
            lat: 0,
            lng: 0,
            direccion: '',
            fuente: 'sin-datos',
            encontrada: false,
          } as UbicacionEmpresa),
        ),
      )
      .subscribe((ubicacion) => {
        this.ubicando.set(false);

        if (!ubicacion.encontrada) {
          return;
        }

        this.ubicar.emit({
          vacante,
          lat: ubicacion.lat,
          lng: ubicacion.lng,
          ciudad: ubicacion.ciudad || ciudad,
          direccion: ubicacion.direccion ?? '',
          fuente: ubicacion.fuente ?? '',
        });
      });
  }

  mostrarTodas(): void {
    this.ubicando.set(true);

    const lista = this.visibles();
    const resultado: VacanteUbicada[] = [];
    let pendientes = lista.length;

    if (!pendientes) {
      this.ubicando.set(false);
      return;
    }

    for (const vacante of lista) {
      this.mapa
        .ubicacionEmpresa(vacante.empresa ?? '', vacante.ubicacion ?? '')
        .pipe(
          switchMap((ubicacion) => of(ubicacion)),
          catchError(() => of(null)),
        )
        .subscribe((ubicacion) => {
          pendientes--;

          if (ubicacion?.encontrada) {
            resultado.push({
              vacante,
              lat: ubicacion.lat,
              lng: ubicacion.lng,
              ciudad: ubicacion.ciudad || (vacante.ubicacion ?? ''),
              direccion: ubicacion.direccion ?? '',
              fuente: ubicacion.fuente ?? '',
            });
          }

          if (pendientes === 0) {
            this.ubicando.set(false);
            this.ubicarTodas.emit(resultado);
          }
        });
    }
  }

  nivel(puntaje: number): 'alta' | 'media' | 'baja' {
    if ((puntaje ?? 0) >= 70) return 'alta';
    if ((puntaje ?? 0) >= 45) return 'media';
    return 'baja';
  }

  limpiar(): void {
    this.busqueda.set('');
    this.seleccionada.set(null);
  }
}
