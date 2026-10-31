import { Component, Input, inject, signal, HostListener, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Publicacion, Comentario } from '../../../../core/models/perfil.model';
import { PerfilService } from '../../../../core/services/perfil.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ShareModalComponent } from '../share-modal/share-modal.component';
import { PostDetalleComponent } from '../post-detalle/post-detalle.component';
import { MencionesTextoComponent } from '../menciones-texto/menciones-texto.component';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ShareModalComponent,
    PostDetalleComponent,
    MencionesTextoComponent,
  ],
  templateUrl: './post-card.component.html',
  styleUrls: ['./post-card.component.scss']
})
export class PostCardComponent implements OnChanges {
  @Input({ required: true }) post!: Publicacion;
  
  private perfilService = inject(PerfilService);
  private authService = inject(AuthService); 
  private elRef = inject(ElementRef);
  private router = inject(Router);

  // --- ESTADOS DE LA UI ---
  mostrarMenu = signal(false);
  mostrarComentarios = signal(false);
  mostrarCompartir = signal(false);
  mostrarOriginal = signal(false);
  estaEditando = signal(false);
  editandoCompartido = signal(false);
  textoCompartido = '';
  
  // --- VARIABLES DE FORMULARIO ---
  textoEditado = '';
  nuevoComentario = '';

  // Nos aseguramos de que el texto original se cargue si el post cambia desde el padre
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['post'] && !this.estaEditando()) {
      this.textoEditado = this.post.texto;
    }
  }

  get inicialesUsuario(): string {
    const user = this.authService.currentUser();
    if (!user || !user.fullName) return '?';
    
    const partes = user.fullName.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    
    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  }

  // ==========================================
  // LÓGICA DE INTERACCIÓN (LIKES Y COMENTARIOS)
  // ==========================================

  toggleLike(): void {
    // Asumiendo que tu perfilService actualiza el estado (likes y liked) de forma reactiva
    this.perfilService.toggleLike(this.post.id as any); 
  }

  toggleComentarios(): void {
    this.mostrarComentarios.update(v => !v);
  }

  enviarComentario(): void {
    const txt = this.nuevoComentario.trim();
    if (!txt) return;
    
    this.perfilService.agregarComentario(this.post.id as any, txt);
    this.nuevoComentario = '';
  }

  // ==========================================
  // LÓGICA DEL MENÚ DE OPCIONES (3 PUNTOS)
  // ==========================================

  toggleMenu(event: Event): void {
    event.stopPropagation(); // Evita que el clic active el HostListener de inmediato
    this.mostrarMenu.update(v => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Si el clic fue fuera del componente, cerramos el menú
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.mostrarMenu.set(false);
    }
  }

  // ==========================================
  // LÓGICA DE EDICIÓN
  // ==========================================

  activarEdicion(): void {
    this.mostrarMenu.set(false); // Cerramos el menú
    this.textoEditado = this.post.texto; // Prellenamos el textarea
    this.estaEditando.set(true); // Activamos el modo edición
  }

  cancelarEdicion(): void {
    this.estaEditando.set(false);
    this.textoEditado = this.post.texto; // Restauramos el texto original por si acaso
  }

  guardarEdicion(): void {
    const txt = this.textoEditado.trim();
    if (!txt) return; // No permitir vacíos

    // Llamamos al servicio (asegúrate de tener este método en tu PerfilService)
    // Si el servicio está diseñado para actualizar el signal de publicaciones, 
    // el cambio se reflejará automáticamente en el HTML.
    this.perfilService.editarPublicacion(this.post.id as any, txt);
    
    // Actualizamos el objeto local de inmediato para que el usuario vea el cambio rápido
    this.post.texto = txt;
    this.estaEditando.set(false);
  }

  // ==========================================
  // LÓGICA DE BORRADO
  // ==========================================

  borrarPost(): void {
    this.mostrarMenu.set(false);
    
    if (confirm('¿Estás seguro de que quieres borrar esta publicación?')) {
      // Llamamos al servicio (asegúrate de tener este método en tu PerfilService)
      this.perfilService.borrarPublicacion(this.post.id as any);
    }
  }
  compartirPost(): void {
    this.mostrarCompartir.set(true);
  }

  verOriginal(): void {
    this.mostrarOriginal.set(true);
  }

  // ==========================================
  // DESCRIPCIÓN DEL COMPARTIDO (EDITAR/BORRAR)
  // ==========================================

  esMiCompartido(): boolean {
    const yo = this.authService.currentUser();
    return (
      !!this.post.shareId &&
      !!yo &&
      String(this.post.shareSharedById ?? '') === String(yo.id)
    );
  }

  editarCompartido(): void {
    this.textoCompartido = this.post.descripcionCompartido ?? '';
    this.editandoCompartido.set(true);
  }

  cancelarCompartido(): void {
    this.editandoCompartido.set(false);
  }

  guardarCompartido(): void {
    const shareId = this.post.shareId;
    if (!shareId) return;

    this.perfilService
      .actualizarDescripcionCompartido(shareId, this.post.id, this.textoCompartido.trim() || null)
      .subscribe({
        next: () => this.editandoCompartido.set(false),
        error: (err) => console.error('No se pudo editar la descripción', err),
      });
  }

  borrarCompartido(): void {
    const shareId = this.post.shareId;
    if (!shareId) return;
    if (!confirm('¿Eliminar la descripción de este compartido?')) return;

    this.perfilService
      .actualizarDescripcionCompartido(shareId, this.post.id, null)
      .subscribe({
        error: (err) => console.error('No se pudo borrar la descripción', err),
      });
  }

  // ==========================================
  // NAVEGACIÓN AL PERFIL DEL AUTOR
  // ==========================================

  irAlAutor(): void {
    this.irAPerfil(this.post.autorId, this.post.autorUsername);
  }

  irAlComentario(comentario: Comentario): void {
    this.irAPerfil(comentario.autorId, comentario.autorUsername);
  }

  private irAPerfil(id?: string, username?: string): void {
    const destino = username || id;
    if (!destino) return;
    this.router.navigate(['/app/perfil', destino]);
  }
}