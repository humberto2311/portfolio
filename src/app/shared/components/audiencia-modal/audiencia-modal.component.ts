import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VISIBILIDADES, VisibilidadContenido } from '../../../core/models/privacidad.model';

@Component({
  selector: 'app-audiencia-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audiencia-modal.component.html',
  styleUrl: './audiencia-modal.component.scss'
})
export class AudienciaModalComponent {

  @Input() visibilidad: VisibilidadContenido = 'PUBLICO';
  @Input() permitidos: string[] = [];
  @Input() excluidos: string[] = [];

  @Output() cerrar = new EventEmitter<void>();
  @Output() confirmar = new EventEmitter<{
    visibilidad: VisibilidadContenido;
    permitidos: string[];
    excluidos: string[];
  }>();

  readonly opciones = VISIBILIDADES;
  readonly elegida = signal<VisibilidadContenido>('PUBLICO');
  readonly permitidosLocales = signal<string[]>([]);
  readonly excluidosLocales = signal<string[]>([]);
  readonly nuevoId = signal('');
  readonly error = signal('');

  readonly requiereLista = computed(() => this.elegida() === 'SOLO_LISTA' || this.elegida() === 'PRIVADO');

  constructor() {
    queueMicrotask(() => {
      this.elegida.set(this.visibilidad);
      this.permitidosLocales.set([...this.permitidos]);
      this.excluidosLocales.set([...this.excluidos]);
    });
  }

  elegir(valor: VisibilidadContenido) {
    this.elegida.set(valor);
    this.error.set('');
  }

  agregar(modo: 'PERMITIDO' | 'EXCLUIDO') {
    const id = this.nuevoId().trim();

    if (!id) {
      this.error.set('Escribe el identificador de la persona.');
      return;
    }

    if (modo === 'PERMITIDO') {
      if (this.permitidosLocales().includes(id)) {
        this.error.set('Esa persona ya está en la lista.');
        return;
      }
      this.permitidosLocales.update((lista) => [...lista, id]);
    } else {
      if (this.excluidosLocales().includes(id)) {
        this.error.set('Esa persona ya está excluida.');
        return;
      }
      this.excluidosLocales.update((lista) => [...lista, id]);
    }

    this.nuevoId.set('');
    this.error.set('');
  }

  quitar(modo: 'PERMITIDO' | 'EXCLUIDO', id: string) {
    if (modo === 'PERMITIDO') {
      this.permitidosLocales.update((lista) => lista.filter((valor) => valor !== id));
    } else {
      this.excluidosLocales.update((lista) => lista.filter((valor) => valor !== id));
    }
  }

  aplicar() {
    if (this.requiereLista() && this.permitidosLocales().length === 0) {
      this.error.set('Elige al menos una persona para esta visibilidad.');
      return;
    }

    this.confirmar.emit({
      visibilidad: this.elegida(),
      permitidos: this.permitidosLocales(),
      excluidos: this.excluidosLocales()
    });
  }
}
