import { Component, Input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Publicacion } from '../../../../core/models/perfil.model';
import { PerfilService } from '../../../../core/services/perfil.service';
import { AuthService } from '../../../../core/services/auth.service';
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
  private authService = inject(AuthService); 



  mostrarComentarios = signal(false);
  nuevoComentario = '';

  get inicialesUsuario(): string {
    const user = this.authService.currentUser();
    if (!user || !user.fullName) return '?';
    
    const partes = user.fullName.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    
    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  }

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