import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  MensajeProgramado,
  MensajesProgramadosService,
} from '../../../core/services/mensajes-programados.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-mensajes-programados',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mensajes-programados.component.html',
  styleUrls: ['./mensajes-programados.component.scss'],
})
export class MensajesProgramadosComponent implements OnInit {
  private servicio = inject(MensajesProgramadosService);
  private toasts = inject(ToastService);

  readonly mensajes = signal<MensajeProgramado[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly trabajando = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.servicio.listar().subscribe({
      next: (lista) => {
        this.mensajes.set(lista);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar tus mensajes programados.');
        this.cargando.set(false);
      },
    });
  }

  pausar(mensaje: MensajeProgramado): void {
    this.trabajando.set(mensaje.id);

    this.servicio.pausar(mensaje.id, !mensaje.activo).subscribe({
      next: (actualizado) => {
        this.mensajes.update((lista) =>
          lista.map((m) => (m.id === actualizado.id ? actualizado : m))
        );
        this.trabajando.set(null);
        this.toasts.show(actualizado.activo ? 'Mensaje reanudado' : 'Mensaje pausado');
      },
      error: () => {
        this.trabajando.set(null);
        this.toasts.show('No se pudo cambiar el estado del mensaje');
      },
    });
  }

  cancelar(mensaje: MensajeProgramado): void {
    this.trabajando.set(mensaje.id);

    this.servicio.cancelar(mensaje.id).subscribe({
      next: () => {
        this.mensajes.update((lista) => lista.filter((m) => m.id !== mensaje.id));
        this.trabajando.set(null);
        this.toasts.show('Mensaje programado eliminado');
      },
      error: () => {
        this.trabajando.set(null);
        this.toasts.show('No se pudo eliminar el mensaje');
      },
    });
  }

  fecha(valor: string | undefined): string {
    if (!valor) return '';
    const fecha = new Date(valor);
    return fecha.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  iniciales(nombre: string | undefined): string {
    if (!nombre) return '?';
    return nombre
      .split(' ')
      .filter((parte) => parte.length > 0)
      .slice(0, 2)
      .map((parte) => parte[0].toUpperCase())
      .join('');
  }
}
