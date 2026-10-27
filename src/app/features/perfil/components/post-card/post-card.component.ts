import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Publicacion } from '../../../../core/models/perfil.model';
import { PerfilService } from '../../../../core/services/perfil.service';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './post-card.component.html',
  styleUrls: ['./post-card.component.scss']
})
export class PostCardComponent {
  @Input({ required: true }) post!: Publicacion;
  private perfilService = inject(PerfilService);

  mostrarComentarios = signal(false);
  nuevoComentario = '';

  toggleLike(): void {
    this.perfilService.toggleLike(this.post.id);
  }

  toggleComentarios(): void {
    this.mostrarComentarios.update(v => !v);
  }

  enviarComentario(): void {
    const txt = this.nuevoComentario.trim();
    if (!txt) return;
    this.perfilService.agregarComentario(this.post.id, txt);
    this.nuevoComentario = '';
  }
}