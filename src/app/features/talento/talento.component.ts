import { Component, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, of, switchMap } from 'rxjs';
import { TalentoService } from '../../core/services/talento.service';
import { TalentoBuscado } from '../../core/models/talento.model';

interface Criterios {
  skill: string;
  rol: string;
}

@Component({
  selector: 'app-talento',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './talento.component.html',
  styleUrls: ['./talento.component.scss'],
})
export class TalentoComponent implements OnDestroy {
  private svc = inject(TalentoService);

  skill = signal('');
  rol = signal('');
  resultados = signal<TalentoBuscado[]>([]);
  buscando = signal(false);
  aviso = signal<string | null>(null);

  private tecleo = new Subject<Criterios>();

  constructor() {
    this.tecleo
      .pipe(
        debounceTime(300),
        switchMap((criterios) => {
          if (!criterios.skill.trim() && !criterios.rol.trim()) {
            return of([] as TalentoBuscado[]);
          }
          return this.svc.buscar(criterios.skill, criterios.rol);
        })
      )
      .subscribe({
        next: (lista) => {
          this.resultados.set(lista ?? []);
          this.buscando.set(false);
        },
        error: () => {
          this.resultados.set([]);
          this.buscando.set(false);
          this.aviso.set('No se pudo buscar talento.');
        },
      });
  }

  ngOnDestroy(): void {
    this.tecleo.complete();
  }

  onSkill(valor: string): void {
    this.skill.set(valor);
    this.consultar();
  }

  onRol(valor: string): void {
    this.rol.set(valor);
    this.consultar();
  }

  limpiar(): void {
    this.skill.set('');
    this.rol.set('');
    this.resultados.set([]);
    this.aviso.set(null);
  }

  /** Inicia la búsqueda solo si hay criterio; si no, deja la lista vacía. */
  get tieneCriterios(): boolean {
    return this.skill().trim().length > 0 || this.rol().trim().length > 0;
  }

  get sinResultados(): boolean {
    return !this.buscando() && this.tieneCriterios && this.resultados().length === 0;
  }

  private consultar(): void {
    this.aviso.set(null);
    this.buscando.set(true);
    this.tecleo.next({ skill: this.skill(), rol: this.rol() });
  }
}
