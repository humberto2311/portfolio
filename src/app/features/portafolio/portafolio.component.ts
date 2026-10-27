import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResumeSection } from '../../core/models/resume.model';
import { EditorItemsComponent } from './editor-items/editor-items.component';

@Component({
  selector: 'app-portafolio',
  standalone: true,
  imports: [CommonModule, FormsModule, EditorItemsComponent],
  templateUrl: './portafolio.component.html',
  styleUrls: ['./portafolio.component.scss']
})
export class PortafolioComponent {
  // 1. MENÚ DE SECCIONES
  public secciones = signal<ResumeSection[]>([
    { 
      id: 1, 
      sectionKey: 'hoja_de_vida', 
      title: 'Hoja de Vida', 
      icon: '📄', 
      displayOrder: 1, 
      isActive: true, 
      items: [] 
    }
  ]);

  // Sección actualmente seleccionada
  public seccionSeleccionada = signal<ResumeSection | null>(null);
  
  // Modal para nueva sección
  public mostrarModal = signal(false);
  public nuevoTitulo = '';
  public nuevoIcono = '📁';

  seleccionarSeccion(sec: ResumeSection) {
    this.seccionSeleccionada.set(sec);
  }

  abrirModal() {
    this.nuevoTitulo = '';
    this.nuevoIcono = '📁';
    this.mostrarModal.set(true);
  }

  cerrarModal() {
    this.mostrarModal.set(false);
  }

  // CREAR UNA NUEVA SECCIÓN (Ej: "Proyectos")
  agregarSeccion() {
    if (!this.nuevoTitulo.trim()) return;

    const nuevaSec: ResumeSection = {
      id: Date.now(),
      sectionKey: this.nuevoTitulo.toLowerCase().replace(/\s+/g, '_'), 
      title: this.nuevoTitulo,
      icon: this.nuevoIcono,
      displayOrder: this.secciones().length + 1,
      isActive: true,
      items: [] // Nace vacía
    };

    this.secciones.update(prev => [...prev, nuevaSec]);
    this.seleccionarSeccion(nuevaSec);
    this.cerrarModal();
  }

  // GUARDAR CAMBIOS (Viene del hijo EditorItems)
  actualizarSeccion(seccionActualizada: ResumeSection) {
    this.secciones.update(prev => 
      prev.map(s => s.id === seccionActualizada.id ? seccionActualizada : s)
    );
    // 👇 Aquí haces el PUT a Spring Boot para guardar la sección y sus ítems en BD
    console.log('Sección guardada:', seccionActualizada);
  }
}