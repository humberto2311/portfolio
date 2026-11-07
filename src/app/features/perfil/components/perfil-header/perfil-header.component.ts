import { Component, Input, Output, EventEmitter, inject, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PerfilData } from '../../../../core/models/perfil.model';
import { ToastService } from '../../../../core/services/toast.service';
import { ConnectionService } from '../../../../core/services/connection.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserProfileService } from '../../../../core/services/user-profile.service';
import { ModalService } from '../../../../core/services/modal.service';
import { SidePanelService } from '../../../../core/services/side-panel.service';
import { FotoPerfil, UserPhotoService } from '../../../../core/services/user-photo.service';
import { imagenDePerfilComoDataUrl } from '../../../../core/utils/imagen.util';
import { PhotoViewerComponent } from '../photo-viewer/photo-viewer.component';

interface CambiosPerfilSocial {
  role?: string;
  state?: string;
  avatarUrl?: string;
  coverUrl?: string;
}

@Component({
  selector: 'app-perfil-header',
  standalone: true,
  imports: [CommonModule, FormsModule, PhotoViewerComponent],
  templateUrl: './perfil-header.component.html',
  styleUrls: ['./perfil-header.component.scss']
})
export class PerfilHeaderComponent implements OnChanges {
  @Input({ required: true }) perfil!: PerfilData;
  @Input() esMiPerfil: boolean = false;

  @Output() accionCv = new EventEmitter<void>();
  @Output() accionProyectos = new EventEmitter<void>();
  @Output() accionMensaje = new EventEmitter<void>();

  isFollowing = false;
  cargandoAccion = false;
  verificandoEstado = true;
  cambiandoEstado = false;

  private toast = inject(ToastService);
  private connectionService = inject(ConnectionService);
  private authService = inject(AuthService);
  private userProfileService = inject(UserProfileService);
  private modalSvc = inject(ModalService);
  private sidePanelSvc = inject(SidePanelService);
  private fotosSvc = inject(UserPhotoService);

  /** Foto del header abierta en grande: avatar o portada, con likes y comentarios. */
  fotoAbierta = signal<FotoPerfil | null>(null);
  fotosGaleria = signal<FotoPerfil[]>([]);
  private fotoDelHeader: FotoPerfil | null = null;
  private tipoAbierto: 'avatar' | 'portada' = 'avatar';

  get disponible(): boolean {
    const estado = (this.perfil?.estado ?? '').toUpperCase();
    return !estado.includes('SIN');
  }

  // ====== ESCRITURA DEL PERFIL SOCIAL ======

  /**
   * El perfil social se guarda completo, así que siempre se lee primero.
   * Una cuenta nueva puede no tener fila: en ese caso se parte de los datos
   * que ya se ven en pantalla para no borrar rol ni estado.
   */
  private actualizarPerfilSocial(
    cambios: CambiosPerfilSocial,
    exito: string,
    fracaso: string
  ): void {
    this.userProfileService.getMiPerfilSocial().subscribe({
      next: (social) => this.escribir({ ...(social ?? {}), ...cambios }, cambios, exito, fracaso),
      error: () => this.escribir(
        { role: this.perfil.rol, state: this.perfil.estado, ...cambios }, cambios, exito, fracaso
      ),
    });
  }

  private escribir(data: any, cambios: CambiosPerfilSocial, exito: string, fracaso: string): void {
    this.userProfileService.guardarMiPerfilSocial(data).subscribe({
      next: () => {
        if (cambios.role !== undefined) this.perfil.rol = cambios.role;
        if (cambios.state !== undefined) this.perfil.estado = cambios.state;
        if (cambios.avatarUrl !== undefined) this.perfil.avatarUrl = cambios.avatarUrl;
        if (cambios.coverUrl !== undefined) this.perfil.coverUrl = cambios.coverUrl;
        this.exito(exito);
      },
      error: () => this.fracaso(fracaso),
    });
  }

  private exito(mensaje: string): void {
    this.guardandoRol = false;
    this.cambiandoEstado = false;
    this.subiendoImagen = false;
    this.editandoRol = false;
    this.toast.show(mensaje);
  }

  private fracaso(mensaje: string): void {
    this.guardandoRol = false;
    this.cambiandoEstado = false;
    this.subiendoImagen = false;
    this.toast.show(mensaje);
  }

  // ====== EDITAR EL ROL (lápiz junto al nombre) ======

  editandoRol = false;
  textoRol = '';
  guardandoRol = false;

  editarRol(): void {
    if (!this.esMiPerfil) return;
    this.textoRol = this.perfil.rol ?? '';
    this.editandoRol = true;
  }

  cancelarRol(): void {
    this.editandoRol = false;
    this.textoRol = '';
  }

  guardarRol(): void {
    if (!this.esMiPerfil || this.guardandoRol) return;

    this.guardandoRol = true;
    this.actualizarPerfilSocial({ role: this.textoRol.trim() || 'User' }, 'Rol actualizado', 'No se pudo guardar el rol');
  }

  // ====== FOTO DE PERFIL Y PORTADA ======

  subiendoImagen = false;

  /** Abre el selector de archivos del sistema; el input se crea al vuelo y se descarta al terminar. */
  elegirImagen(tipo: 'avatar' | 'portada'): void {
    if (!this.esMiPerfil || this.subiendoImagen) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = () => {
      const archivo = input.files?.[0];
      if (archivo) this.subirImagen(archivo, tipo);
    };
    input.click();
  }

  private subirImagen(archivo: File, tipo: 'avatar' | 'portada'): void {
    this.subiendoImagen = true;

    imagenDePerfilComoDataUrl(archivo, tipo).then(
      (dataUrl) => this.actualizarPerfilSocial(
        tipo === 'avatar' ? { avatarUrl: dataUrl } : { coverUrl: dataUrl },
        tipo === 'avatar' ? 'Foto de perfil actualizada' : 'Portada actualizada',
        'No se pudo guardar la imagen'
      ),
      () => this.fracaso('No se pudo procesar la imagen')
    );
  }

  /** El backend guarda null cuando la URL viene vacía, así el header vuelve al degradado. */
  quitarPortada(): void {
    if (!this.esMiPerfil || this.subiendoImagen) return;

    this.subiendoImagen = true;
    this.actualizarPerfilSocial({ coverUrl: '' }, 'Portada eliminada', 'No se pudo quitar la portada');
  }

  /**
   * Avatar y portada viven también en la galería; asegurar() devuelve esa fila
   * (creándola si es antigua) y es la que permite likear y comentar la foto.
   */
  abrirVisor(tipo: 'avatar' | 'portada'): void {
    const url = tipo === 'avatar' ? this.perfil.avatarUrl : this.perfil.coverUrl;
    if (!url) return;

    if (!this.authService.isAuthenticated()) {
      this.toast.show('Debes iniciar sesión para ver la foto en grande');
      this.modalSvc.openLogin();
      return;
    }

    this.tipoAbierto = tipo;
    this.fotosSvc.asegurar(this.perfil.id, url).subscribe({
      next: (foto) => this.abrirConGaleria(foto),
      error: () => this.toast.show('Esta foto todavía no admite comentarios'),
    });
  }

  private abrirConGaleria(foto: FotoPerfil): void {
    this.fotoDelHeader = foto;
    this.fotoAbierta.set(foto);

    this.fotosSvc.listar(this.perfil.id).subscribe({
      next: (lista) => this.fotosGaleria.set(this.conAbierta(lista ?? [], foto)),
      error: () => this.fotosGaleria.set([foto]),
    });
  }

  private conAbierta(lista: FotoPerfil[], foto: FotoPerfil): FotoPerfil[] {
    const sinRepetida = lista.filter((f) => f.id !== foto.id);
    return sinRepetida.length === lista.length ? [foto, ...sinRepetida] : lista;
  }

  /** Borrar desde el visor también despega la foto del perfil: el backend ya lo hace, aquí se refleja. */
  alEliminarFoto(photoId: number): void {
    this.fotoAbierta.set(null);
    if (this.fotoDelHeader?.id !== photoId) return;

    if (this.tipoAbierto === 'avatar') this.perfil.avatarUrl = undefined;
    else this.perfil.coverUrl = undefined;
  }

  /** Botón DISPONIBLE / SIN DISPONIBILIDAD (solo en el perfil propio). */
  toggleDisponibilidad(): void {
    if (!this.esMiPerfil || this.cambiandoEstado) return;

    const nuevo = this.disponible ? 'SIN DISPONIBILIDAD' : 'DISPONIBLE';
    this.cambiandoEstado = true;
    this.actualizarPerfilSocial({ state: nuevo },
      nuevo === 'DISPONIBLE' ? 'Ahora estás disponible' : 'Te marcaste sin disponibilidad',
      'No se pudo guardar el estado');
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['perfil'] && this.perfil) {
      this.verificarEstadoSeguimiento();
    }
  }

  verificarEstadoSeguimiento() {
    this.verificandoEstado = true;
    this.isFollowing = false;
    
    // Si no está logueado, no consultamos al backend para evitar errores 401
    if (!this.authService.isAuthenticated()) {
      this.verificandoEstado = false;
      return;
    }

    if (!this.esMiPerfil && this.perfil?.id) {
      this.connectionService.checkFollowing(this.perfil.id).subscribe({
        next: (follows) => {
          this.isFollowing = follows;
          this.verificandoEstado = false;
        },
        error: () => {
          this.isFollowing = false;
          this.verificandoEstado = false;
        }
      });
    } else {
      this.verificandoEstado = false;
    }
  }

  toggleFollow(): void {
    // Si no está logueado, abre el modal
    if (!this.authService.isAuthenticated()) {
      this.toast.show('Debes iniciar sesión para seguir a este usuario');
      this.modalSvc.openLogin(); 
      return;
    }

    if (this.cargandoAccion || this.verificandoEstado) return;
    this.cargandoAccion = true;

    const action$ = this.isFollowing
      ? this.connectionService.unfollowUser(this.perfil.id)
      : this.connectionService.followUser(this.perfil.id);

    action$.subscribe({
      next: () => {
        this.isFollowing = !this.isFollowing;
        this.toast.show(
          this.isFollowing
            ? `Ahora sigues a ${this.perfil.nombre}`
            : `Has dejado de seguir a ${this.perfil.nombre}`
        );
        this.cargandoAccion = false;
      },
      error: () => {
        this.toast.show('Error al procesar la solicitud');
        this.cargandoAccion = false;
      }
    });
  }

  // ====== ACCIÓN DE MENSAJE ======
  onMensaje(): void {
    if (!this.authService.isAuthenticated()) {
      this.toast.show('Debes iniciar sesión para enviar un mensaje');
      this.modalSvc.openLogin();
      return;
    }

    this.sidePanelSvc.abrirChatCon({
      id: this.perfil.id,
      name: this.perfil.nombre,
      avatar: this.perfil.avatarUrl,
      statusText: this.perfil.estado ?? '',
    });
    this.accionMensaje.emit();
  }
}