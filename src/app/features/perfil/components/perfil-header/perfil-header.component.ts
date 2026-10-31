import { Component, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PerfilData } from '../../../../core/models/perfil.model';
import { ToastService } from '../../../../core/services/toast.service';
import { ConnectionService } from '../../../../core/services/connection.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserProfileService } from '../../../../core/services/user-profile.service';
import { ModalService } from '../../../../core/services/modal.service';

@Component({
  selector: 'app-perfil-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  /** true si el perfil está marcado como disponible. */
  get disponible(): boolean {
    const estado = (this.perfil?.estado ?? '').toUpperCase();
    return !estado.includes('SIN');
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

    const rol = this.textoRol.trim() || 'User';
    this.guardandoRol = true;

    this.userProfileService.getMiPerfilSocial().subscribe({
      next: (social) => {
        this.userProfileService
          .guardarMiPerfilSocial({ ...social, role: rol })
          .subscribe({
            next: () => {
              this.perfil.rol = rol;
              this.guardandoRol = false;
              this.editandoRol = false;
              this.toast.show('Rol actualizado');
            },
            error: () => {
              this.guardandoRol = false;
              this.toast.show('No se pudo guardar el rol');
            },
          });
      },
      error: () => {
        this.guardandoRol = false;
        this.toast.show('No se pudo leer tu perfil social');
      },
    });
  }

  /** Botón DISPONIBLE / SIN DISPONIBILIDAD (solo en el perfil propio). */
  toggleDisponibilidad(): void {
    if (!this.esMiPerfil || this.cambiandoEstado) return;

    const nuevo = this.disponible ? 'SIN DISPONIBILIDAD' : 'DISPONIBLE';
    this.cambiandoEstado = true;

    this.userProfileService.getMiPerfilSocial().subscribe({
      next: (social) => {
        this.userProfileService
          .guardarMiPerfilSocial({ ...social, state: nuevo })
          .subscribe({
            next: () => {
              this.perfil.estado = nuevo;
              this.cambiandoEstado = false;
              this.toast.show(
                nuevo === 'DISPONIBLE'
                  ? 'Ahora estás disponible'
                  : 'Te marcaste sin disponibilidad'
              );
            },
            error: () => {
              this.cambiandoEstado = false;
              this.toast.show('No se pudo guardar el estado');
            },
          });
      },
      error: () => {
        this.cambiandoEstado = false;
        this.toast.show('No se pudo leer tu perfil social');
      },
    });
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

  emitirAccion(msg: string): void {
    this.toast.show(msg);
  }

  toggleFollow(): void {
    // 👇 SI NO ESTÁ LOGUEADO, ABRE EL MODAL
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

  onMensaje(): void {
  
    if (!this.authService.isAuthenticated()) {
      this.toast.show('Debes iniciar sesión para enviar un mensaje');
      this.modalSvc.openLogin();
      return;
    }
    this.accionMensaje.emit();
  }
}