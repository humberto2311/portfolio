import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Publicacion } from '../../../../core/models/perfil.model';
import { MencionesTextoComponent } from '../menciones-texto/menciones-texto.component';

/** Vista de solo lectura de la publicación original (sin acciones). */
@Component({
  selector: 'app-post-detalle',
  standalone: true,
  imports: [CommonModule, MencionesTextoComponent],
  templateUrl: './post-detalle.component.html',
  styleUrls: ['./post-detalle.component.scss'],
})
export class PostDetalleComponent {
  @Input({ required: true }) post!: Publicacion;
  @Output() cerrado = new EventEmitter<void>();

  private router = inject(Router);

  irAlAutor(): void {
    const destino = this.post.autorUsername || this.post.autorId;
    if (!destino) return;
    this.cerrado.emit();
    this.router.navigate(['/app/perfil', destino]);
  }
}
