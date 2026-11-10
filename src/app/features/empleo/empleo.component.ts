import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { BusquedaEmpleo, Vacante } from '../../core/models/empleo.model';
import { EmpleoService } from '../../core/services/empleo.service';

@Component({
  selector: 'app-empleo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './empleo.component.html',
  styleUrls: ['./empleo.component.scss'],
})
export class EmpleoComponent implements OnInit {
  private svc = inject(EmpleoService);

  readonly termino = signal('');
  readonly ciudad = signal('');
  readonly modalidad = signal('');
  readonly buscando = signal(false);
  readonly error = signal<string | null>(null);
  readonly busqueda = signal<BusquedaEmpleo | null>(null);
  readonly historial = signal<BusquedaEmpleo[]>([]);
  readonly detalle = signal<Vacante | null>(null);
  readonly descartadas = signal<string[]>([]);

  readonly modalidades = ['', 'Remoto', 'Híbrido', 'Presencial'];

  ngOnInit(): void {
    this.svc.ultima().subscribe((ultima) => {
      if (ultima) this.busqueda.set(ultima);
    });
    this.svc.historial().subscribe((lista) => this.historial.set(lista));
  }

  buscar(): void {
    const termino = this.termino().trim();
    if (!termino) {
      this.error.set('Escribe el cargo o la tecnología que buscas.');
      return;
    }

    this.buscando.set(true);
    this.error.set(null);

    this.svc.buscar(termino, this.ciudad().trim(), this.modalidad()).subscribe({
      next: (resultado) => {
        this.buscando.set(false);
        this.busqueda.set(resultado);
        this.descartadas.set([]);
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
      .sort((a, b) => b.puntaje - a.puntaje);
  }

  get mejor(): Vacante | null {
    return this.resultados[0] ?? null;
  }

  clave(vacante: Vacante): string {
    return vacante.enlace ?? `${vacante.cargo}|${vacante.empresa}`;
  }

  descartar(vacante: Vacante): void {
    this.descartadas.update((lista) => [...lista, this.clave(vacante)]);
    if (this.detalle() && this.clave(this.detalle()!) === this.clave(vacante)) this.detalle.set(null);
  }

  ver(vacante: Vacante): void {
    this.detalle.set(this.detalle()?.enlace === vacante.enlace ? null : vacante);
  }

  abrir(vacante: Vacante): void {
    if (vacante.enlace) window.open(vacante.enlace, '_blank', 'noopener');
  }

  usarHistorial(item: BusquedaEmpleo): void {
    this.termino.set(item.termino);
    this.ciudad.set(item.ciudad ?? '');
    this.modalidad.set(item.modalidad ?? '');
    this.busqueda.set(item);
    this.descartadas.set([]);
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
