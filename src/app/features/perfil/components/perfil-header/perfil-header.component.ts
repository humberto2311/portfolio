import { Component, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerfilData } from '../../../../core/models/perfil.model';
import { ToastService } from '../../../../core/services/toast.service';
import { ConnectionService } from '../../../../core/services/connection.service';

@Component({
  selector: 'app-perfil-header',
  standalone: true,
  imports: [CommonModule],
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

  private toast = inject(ToastService);
  private connectionService = inject(ConnectionService);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['perfil'] && this.perfil) {
      this.verificarEstadoSeguimiento();
    }
  }

  verificarEstadoSeguimiento() {
    this.verificandoEstado = true;
    this.isFollowing = false;
    
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
}