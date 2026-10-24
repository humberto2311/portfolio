import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProyectosService } from '../../core/services/proyectos.service';
import { Proyecto } from '../../core/models/proyecto';

@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './proyectos.component.html',
  styleUrls: ['./proyectos.component.scss']
})
export class ProyectosComponent implements OnInit {
  
  private proyectosService = inject(ProyectosService);

  public proyectos: Proyecto[] = [];
  public cargando: boolean = true;
  public error: string | null = null;

  public panelAbierto: boolean = false;
  public proyectoActivo: Proyecto | null = null;
  public pestanaActiva: 'codigo' | 'git' = 'codigo';

  get comandoClonar(): string {
    if (!this.proyectoActivo) return '';
    // Usamos la URL de clonación real y la primera rama (o 'main' por defecto)
    const rama = this.proyectoActivo.branches && this.proyectoActivo.branches.length > 0 
      ? this.proyectoActivo.branches[0] 
      : 'main';
    return `git clone -b ${rama} ${this.proyectoActivo.cloneUrl}`;
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
    document.body.style.overflow = 'hidden';
  }

  cerrarPanel() {
    this.panelAbierto = false;
    setTimeout(() => {
      this.proyectoActivo = null;
    }, 300);
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

  // ==========================================
  // LÓGICA DE LA TARJETA 3D
  // ==========================================
  onCardTilt(event: MouseEvent, proyecto: Proyecto): void {
    const card = document.getElementById('card-' + proyecto.name);
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    
    const rotateX = (-y / 15); 
    const rotateY = (x / 15);

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    
    card.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
    card.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
  }

  resetCardTilt(proyecto: Proyecto): void {
    const card = document.getElementById('card-' + proyecto.name);
    if (!card) return;
    
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
  }
}