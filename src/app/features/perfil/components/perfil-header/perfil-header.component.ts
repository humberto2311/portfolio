import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerfilData } from '../../../../core/models/perfil.model';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-perfil-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil-header.component.html',
  styleUrls: ['./perfil-header.component.scss']
})
export class PerfilHeaderComponent {
  @Input({ required: true }) perfil!: PerfilData;
  @Input() esMiPerfil: boolean = false;

  @Output() accionCv = new EventEmitter<void>();
  @Output() accionProyectos = new EventEmitter<void>();

  private toast = inject(ToastService);

  emitirAccion(msg: string): void {
    this.toast.show(msg);
  }
}