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
  
  // Inyectamos el servicio
  private proyectosService = inject(ProyectosService);

  // Variables de estado
  public proyectos: Proyecto[] = [];
  public cargando: boolean = true;
  public error: string | null = null;

  // Variables de la cortina
  public panelAbierto: boolean = false;
  public proyectoActivo: Proyecto | null = null;
  public pestanaActiva: 'codigo' | 'git' = 'codigo';

  // Comando de clonación dinámico basado en la URL del proyecto
  get comandoClonar(): string {
    if (!this.proyectoActivo) return '';
    return `git clone -b ${this.proyectoActivo.ramaPrincipal} ${this.proyectoActivo.urlRepositorio}.git`;
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
        this.error = 'Hubo un error al cargar los proyectos.';
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
}