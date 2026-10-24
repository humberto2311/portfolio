import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProyectosService } from '../../core/services/proyectos.service';
import { Proyecto } from '../../core/models/proyecto';

@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './proyectos.component.html',
  styleUrls: ['./proyectos.component.scss']
})
export class ProyectosComponent implements OnInit {
  
  private proyectosService = inject(ProyectosService);

  public proyectos: Proyecto[] = [];
  public cargando: boolean = true;
  public error: string | null = null;
  public busqueda: string = '';

  public panelAbierto: boolean = false;
  public proyectoActivo: Proyecto | null = null;
  public pestanaActiva: 'codigo' | 'git' = 'codigo';

  public ramaSeleccionada: string = 'main';

  // Limpia el nombre de la rama (quita refs/heads/)
  public limpiarNombreRama(rama: string): string {
    if (!rama) return 'main';
    return rama.replace('refs/heads/', '');
  }

  get proyectosFiltrados(): Proyecto[] {
    if (!this.busqueda.trim()) return this.proyectos;
    const term = this.busqueda.toLowerCase().trim();
    return this.proyectos.filter(p => 
      p.name.toLowerCase().includes(term) || 
      (p.stack && p.stack.some(s => s.toLowerCase().includes(term))) ||
      (p.description && p.description.toLowerCase().includes(term))
    );
  }

  get comandoClonar(): string {
    if (!this.proyectoActivo) return '';
    // Usa la rama seleccionada (ya limpia)
    const rama = this.limpiarNombreRama(this.ramaSeleccionada);
    return `git clone -b ${rama} ${this.proyectoActivo.cloneUrl}`;
  }

  get enlaceGithubRama(): string {
    if (!this.proyectoActivo) return '#';
    const urlBase = this.proyectoActivo.cloneUrl ? this.proyectoActivo.cloneUrl.replace('.git', '') : '#';
    const rama = this.limpiarNombreRama(this.ramaSeleccionada);
    return `${urlBase}/tree/${rama}`;
  }

  ngOnInit() {
    this.cargarProyectos();
  }

  cargarProyectos() {
    this.cargando = true;
    this.error = null;

    this.proyectosService.getProyectos().subscribe({
      next: (data) => {
        this.proyectos = data;
        this.cargando = false;
      },
      error: (err) => {
        this.error = 'Hubo un error al cargar los proyectos desde la base de datos.';
        this.cargando = false;
        console.error(err);
      }
    });
  }

  abrirPanel(proyecto: Proyecto) {
    this.proyectoActivo = proyecto;
    this.panelAbierto = true;
    this.pestanaActiva = 'codigo';
    
    // Al abrir, inicializamos con la primera rama disponible
    this.ramaSeleccionada = proyecto.branches && proyecto.branches.length > 0 
      ? proyecto.branches[0] 
      : 'main';

    document.body.style.overflow = 'hidden';
  }

  cerrarPanel() {
    this.panelAbierto = false;
    setTimeout(() => { this.proyectoActivo = null; }, 300);
    document.body.style.overflow = 'auto';
  }

  cambiarPestana(pestana: 'codigo' | 'git') {
    this.pestanaActiva = pestana;
  }

  copiarComando() {
    if (this.comandoClonar) {
      navigator.clipboard.writeText(this.comandoClonar).then(() => {
        alert('¡Comando copiado al portapapeles!');
      });
    }
  }

  formatearFecha(fecha: string | null): string {
    if (!fecha) return 'Sin fecha';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  onCardTilt(event: MouseEvent, proyecto: Proyecto): void {
    const card = document.getElementById('card-' + proyecto.name);
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    
    card.style.transform = `perspective(1000px) rotateX(${(-y / 35)}deg) rotateY(${(x / 35)}deg) scale3d(1.01, 1.01, 1.01)`;
    card.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
    card.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
  }

  resetCardTilt(proyecto: Proyecto): void {
    const card = document.getElementById('card-' + proyecto.name);
    if (!card) return;
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
  }
}