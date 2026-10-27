import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResumeSection, ResumeItem } from '../../../core/models/resume.model';

@Component({
  selector: 'app-editor-items',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor-items.component.html',
  styleUrls: ['./editor-items.component.scss']
})


export class EditorItemsComponent implements OnChanges {
  @Input() seccion!: ResumeSection;
  @Output() guardarSeccion = new EventEmitter<ResumeSection>();

  public seccionLocal: ResumeSection = {
    sectionKey: '',
    title: '',
    icon: '',
    displayOrder: 0,
    isActive: true,
    items: [] 
  };

  // 👇 GETTER MÁGICO: Angular siempre verá un arreglo válido
  get itemsSeguros(): ResumeItem[] {
    if (!this.seccionLocal) return [];
    if (!this.seccionLocal.items) {
      this.seccionLocal.items = []; // Lo creamos si no existe
    }
    return this.seccionLocal.items;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['seccion'] && this.seccion) {
      this.seccionLocal = JSON.parse(JSON.stringify(this.seccion));
      if (!this.seccionLocal.items) this.seccionLocal.items = [];
    }
  }

  agregarItem() {
    const nuevoItem: ResumeItem = {
      id: Date.now(),
      displayOrder: this.itemsSeguros.length + 1,
      source: 'manual',
      content: this.crearEstructuraVacia(this.seccionLocal.sectionKey)
    };
    this.itemsSeguros.push(nuevoItem);
  }

  eliminarItem(index: number) {
    this.itemsSeguros.splice(index, 1);
  }

  onGuardar() {
    this.guardarSeccion.emit(this.seccionLocal);
  }

  private crearEstructuraVacia(key: string): any {
    if (key === 'hoja_de_vida') return { titulo: '', institucion: '', fecha: '', descripcion: '' };
    if (key === 'proyectos') return { nombre: '', tecnologias: '', url: '', descripcion: '' };
    return { titulo: '', descripcion: '' };
  }
}