import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Comentario } from '../../../../core/models/perfil.model';
import { FotoPerfil, UserPhotoService } from '../../../../core/services/user-photo.service';
import { PerfilService } from '../../../../core/services/perfil.service';
import { UserProfileService } from '../../../../core/services/user-profile.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ModalService } from '../../../../core/services/modal.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ArchivoService } from '../../../../core/services/archivo.service';
import { MencionesTextoComponent } from '../menciones-texto/menciones-texto.component';

/**
 * La foto en grande, con descripción, me gusta y comentarios, como en Facebook.
 * Se abre desde la galería y desde el avatar o la portada del perfil, propio o ajeno.
 */
@Component({
  selector: 'app-photo-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, MencionesTextoComponent],
  templateUrl: './photo-viewer.component.html',
  styleUrls: ['./photo-viewer.component.scss'],
})
export class PhotoViewerComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input({ required: true }) foto!: FotoPerfil;
  @Input() esMiPerfil = false;

  @Output() cerrado = new EventEmitter<void>();
  @Output() descripcionCambiada = new EventEmitter<FotoPerfil>();
  @Output() eliminada = new EventEmitter<number>();

  private fotos = inject(UserPhotoService);
  private perfiles = inject(PerfilService);
  private miPerfil = inject(UserProfileService);
  private auth = inject(AuthService);
  private modal = inject(ModalService);
  private toast = inject(ToastService);
  private archivos = inject(ArchivoService);
  private el = inject(ElementRef) as ElementRef<HTMLElement>;
  private scrollPrevio = '';

  likes = signal(this.foto.likesCount ?? 0);
  likedByMe = signal(this.foto.likedByMe ?? false);
  comentarios = signal<Comentario[]>([]);
  totalComentarios = signal(this.foto.commentsCount ?? 0);
  cargando = signal(true);
  enviando = signal(false);
  guardandoDescripcion = signal(false);

  descripcion = signal(this.foto.descripcion ?? '');
  editandoDescripcion = signal(false);
  textoDescripcion = '';

  nuevoComentario = '';
  comentarioMenu = signal<string | null>(null);
  comentarioEditando = signal<string | null>(null);
  textoComentarioEditado = '';

  readonly avatar = this.miPerfil.avatar;
  readonly iniciales = computed(() => {
    const nombre = this.auth.currentUser()?.fullName ?? '';
    const partes = nombre.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '?';
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  });

  ngOnInit(): void {
    this.miPerfil.cargarMiAvatar();
    this.cargarComentarios();
  }

  /**
   * Cualquier ancestro con transform o filter (el fadeIn de .tab-content, por ejemplo)
   * convierte a `position: fixed` en relativo a ese div, y el visor deja de ocupar la
   * pantalla. Colgado del body ya no tiene jefes que lo recorten.
   */
  ngAfterViewInit(): void {
    document.body.appendChild(this.el.nativeElement);
    this.scrollPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    document.body.style.overflow = this.scrollPrevio;
    this.el.nativeElement.remove();
  }

  private cargarComentarios(): void {
    this.fotos.comentarios(this.foto.id).subscribe({
      next: (page) => {
        this.comentarios.set(page.content.map((c) => this.perfiles.mapComentario(c)));
        this.totalComentarios.set(page.totalElements);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  like(): void {
    if (!this.puedeEscribir()) return;

    this.fotos.like(this.foto.id).subscribe({
      next: ({ liked, likesCount }) => {
        this.likedByMe.set(liked);
        this.likes.set(likesCount);
      },
      error: () => this.toast.show('No se pudo registrar el me gusta'),
    });
  }

  // ====== DESCRIPCIÓN ======

  comenzarDescripcion(): void {
    this.textoDescripcion = this.descripcion() ?? '';
    this.editandoDescripcion.set(true);
  }

  cancelarDescripcion(): void {
    this.editandoDescripcion.set(false);
    this.textoDescripcion = '';
  }

  guardarDescripcion(): void {
    if (this.guardandoDescripcion()) return;

    this.guardandoDescripcion.set(true);
    const texto = this.textoDescripcion.trim();

    this.fotos.cambiarDescripcion(this.foto.id, texto).subscribe({
      next: (foto) => {
        this.descripcion.set(foto.descripcion ?? '');
        this.editandoDescripcion.set(false);
        this.guardandoDescripcion.set(false);
        this.descripcionCambiada.emit(foto);
        this.toast.show('Descripción guardada');
      },
      error: () => {
        this.guardandoDescripcion.set(false);
        this.toast.show('No se pudo guardar la descripción');
      },
    });
  }

  // ====== COMENTARIOS ======

  enviarComentario(): void {
    const texto = this.nuevoComentario.trim();
    if (!texto || this.enviando()) return;
    if (!this.puedeEscribir()) return;

    this.enviando.set(true);
    this.fotos.comentar(this.foto.id, texto).subscribe({
      next: (dto) => {
        this.comentarios.update((lista) => [...lista, this.perfiles.mapComentario(dto)]);
        this.totalComentarios.update((n) => n + 1);
        this.nuevoComentario = '';
        this.enviando.set(false);
      },
      error: (err) => {
        this.enviando.set(false);
        this.toast.show(err?.error?.message ?? 'No se pudo publicar el comentario');
      },
    });
  }

  likeComentario(c: Comentario): void {
    if (!this.puedeEscribir()) return;

    this.fotos.likeComentario(this.foto.id, c.id).subscribe({
      next: ({ liked, likesCount }) => this.cambiarComentario(c.id, { likes: likesCount, likedByMe: liked }),
      error: () => this.toast.show('No se pudo registrar el me gusta'),
    });
  }

  toggleMenuComentario(c: Comentario, event: Event): void {
    event.stopPropagation();
    this.comentarioMenu.update((id) => (id === c.id ? null : c.id));
  }

  comenzarEdicion(c: Comentario): void {
    this.comentarioMenu.set(null);
    this.comentarioEditando.set(c.id);
    this.textoComentarioEditado = c.texto;
  }

  cancelarEdicion(): void {
    this.comentarioEditando.set(null);
    this.textoComentarioEditado = '';
  }

  guardarEdicion(c: Comentario): void {
    const texto = this.textoComentarioEditado.trim();
    if (!texto) return;

    this.fotos.editarComentario(this.foto.id, c.id, texto).subscribe({
      next: (dto) => {
        this.cambiarComentario(c.id, { texto: dto.content });
        this.cancelarEdicion();
      },
      error: () => this.toast.show('No se pudo editar el comentario'),
    });
  }

  eliminarComentario(c: Comentario): void {
    this.fotos.borrarComentario(this.foto.id, c.id).subscribe({
      next: () => {
        this.comentarios.update((lista) => lista.filter((item) => item.id !== c.id));
        this.totalComentarios.update((n) => Math.max(0, n - 1));
        this.comentarioEditando.set(null);
        this.comentarioMenu.set(null);
      },
      error: () => this.toast.show('No se pudo eliminar el comentario'),
    });
  }

  esMiComentario(c: Comentario): boolean {
    return this.perfiles.esComentarioPropio(c.autorId);
  }

  private cambiarComentario(id: string, cambios: Partial<Comentario>): void {
    this.comentarios.update((lista) =>
      lista.map((c) => (c.id === id ? { ...c, ...cambios } : c))
    );
  }

  // ====== ACCIONES DE LA FOTO ======

  compartir(): void {
    this.archivos.guardar(this.aBlob(this.foto.url), 'foto-perfil', 'Foto del perfil').then((resultado) => {
      if (resultado === 'cancelado') return;
      this.toast.show(resultado === 'compartido' ? 'Foto compartida' : 'Foto descargada');
    });
  }

  eliminar(): void {
    this.fotos.borrar(this.foto.id).subscribe({
      next: () => {
        this.eliminada.emit(this.foto.id);
        this.toast.show('Foto eliminada');
      },
      error: () => this.toast.show('No se pudo eliminar la foto'),
    });
  }

  cerrar(): void {
    this.cerrado.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cerrar();
  }

  /** Sin sesión se puede mirar, pero no likear ni comentar. */
  private puedeEscribir(): boolean {
    if (this.auth.isAuthenticated()) return true;
    this.toast.show('Debes iniciar sesión para interactuar');
    this.modal.openLogin();
    return false;
  }

  /** Las fotos se guardan como data URL; para compartirlas hace falta el binario. */
  private aBlob(dataUrl: string): Blob {
    const [meta, datos] = dataUrl.split(',');
    if (!datos) return new Blob([], { type: 'image/jpeg' });

    const mime = /:(.*?);/.exec(meta)?.[1] ?? 'image/jpeg';
    const binario = atob(datos);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
}
