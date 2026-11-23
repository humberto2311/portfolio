import { Component, Input, inject, signal, HostListener, ElementRef, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Publicacion, Comentario } from '../../../../core/models/perfil.model';
import { PerfilService } from '../../../../core/services/perfil.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserProfileService } from '../../../../core/services/user-profile.service';
import { ShareModalComponent } from '../share-modal/share-modal.component';
import { PostDetalleComponent } from '../post-detalle/post-detalle.component';
import { MencionesTextoComponent } from '../menciones-texto/menciones-texto.component';
import { MencionesDirective } from '../../../../shared/directives/menciones.directive';
import { ConfirmationModalService } from '../../../../core/services/confirmation-modal.service';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ShareModalComponent,
    PostDetalleComponent,
    MencionesTextoComponent,
    MencionesDirective,
  ],
  templateUrl: './post-card.component.html',
  styleUrls: ['./post-card.component.scss']
})
export class PostCardComponent implements OnInit, OnChanges {
  @Input({ required: true }) post!: Publicacion;
  
  private perfilService = inject(PerfilService);
  private authService = inject(AuthService);
  private elRef = inject(ElementRef);
  private router = inject(Router);
  private perfiles = inject(UserProfileService);
  private confirmationModal = inject(ConfirmationModalService);

  /** Foto de quien escribe el comentario; sin ella quedan las iniciales. */
  readonly miAvatar = this.perfiles.avatar;

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
  textoComentarioEditado = '';
  comentarioEditando = signal<string | null>(null);
  comentarioMenu = signal<string | null>(null);

  ngOnInit(): void {
    this.perfiles.cargarMiAvatar();
  }

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
    const abrir = !this.mostrarComentarios();
    this.mostrarComentarios.set(abrir);
    if (abrir) this.perfilService.cargarComentarios(this.post.id as any);
  }

  esMiComentario(comentario: Comentario): boolean {
    return this.perfilService.esComentarioPropio(comentario.autorId);
  }

  likeComentario(comentario: Comentario): void {
    this.perfilService.likeComentario(this.post.id as any, comentario.id);
  }

  toggleMenuComentario(comentario: Comentario, event: Event): void {
    event.stopPropagation();
    this.comentarioMenu.set(this.comentarioMenu() === comentario.id ? null : comentario.id);
  }

  comenzarEdicionComentario(comentario: Comentario): void {
    this.comentarioMenu.set(null);
    this.comentarioEditando.set(comentario.id);
    this.textoComentarioEditado = comentario.texto;
  }

  cancelarEdicionComentario(): void {
    this.comentarioEditando.set(null);
    this.textoComentarioEditado = '';
  }

  guardarEdicionComentario(comentario: Comentario): void {
    const texto = this.textoComentarioEditado.trim();
    if (!texto) return;

    this.perfilService.editarComentario(this.post.id as any, comentario.id, texto);
    this.cancelarEdicionComentario();
  }

  async eliminarComentario(comentario: Comentario): Promise<void> {
    this.comentarioMenu.set(null);

    const confirmed = await this.confirmationModal.confirmDelete('este comentario');
    if (!confirmed) return;

    this.perfilService.borrarComentario(this.post.id as any, comentario.id);
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
      this.comentarioMenu.set(null);
    }
  }

  // ==========================================
  // LÓGICA DE EDICIÓN
  // ==========================================

  activarEdicion(): void {
    // Doble cierre: aunque el menú ya no se dibuje para un post ajeno,
    // la acción no se ejecuta si no eres el autor.
    if (!this.esMiPublicacion()) return;

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

  async borrarPost(): Promise<void> {
    if (!this.esMiPublicacion()) return;

    this.mostrarMenu.set(false);

    const confirmed = await this.confirmationModal.confirmDelete('esta publicación');
    if (confirmed) {
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

  /** Solo el autor puede editar o borrar la publicación. */
  esMiPublicacion(): boolean {
    return this.perfilService.esPublicacionPropia(this.post);
  }

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

  async borrarCompartido(): Promise<void> {
    const shareId = this.post.shareId;
    if (!shareId) return;

    const confirmed = await this.confirmationModal.confirmDelete('la descripción de este compartido');
    if (!confirmed) return;

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