import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrivacidadService } from '../../core/services/privacidad.service';
import {
  AlcanceBloqueo,
  PRESENCIAS,
  Presencia,
  VisibilidadEstados
} from '../../core/models/privacidad.model';
import { ToastService } from '../../core/services/toast.service';
import { AudienciaService } from '../../core/services/audiencia.service';

@Component({
  selector: 'app-ajustes-privacidad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ajustes-privacidad.component.html',
  styleUrls: ['./ajustes-privacidad.component.scss']
})
export class AjustesPrivacidadComponent implements OnInit {

  private svc = inject(PrivacidadService);
  private toast = inject(ToastService);
  private audiencia = inject(AudienciaService);

  readonly presencias = PRESENCIAS;
  readonly visibilidades: Array<{ valor: VisibilidadEstados; etiqueta: string; detalle: string }> = [
    { valor: 'TODOS', etiqueta: 'Todos', detalle: 'Cualquiera puede ver tus estados' },
    { valor: 'CONTACTOS', etiqueta: 'Solo contactos', detalle: 'Solo quien tenga cuenta en N-SOFT' },
    { valor: 'NADIE', etiqueta: 'Nadie', detalle: 'Tus estados quedan solo para ti' }
  ];
  readonly alcances: Array<{ valor: AlcanceBloqueo; etiqueta: string }> = [
    { valor: 'TODO', etiqueta: 'Todo' },
    { valor: 'CHAT', etiqueta: 'Solo chat' },
    { valor: 'ESTADOS', etiqueta: 'Solo estados' },
    { valor: 'PUBLICACIONES', etiqueta: 'Solo publicaciones' }
  ];

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly nuevoBloqueo = signal('');
  readonly alcanceNuevo = signal<AlcanceBloqueo>('TODO');

  readonly presencia = signal<Presencia>('EN_LINEA');
  readonly mostrarUltimaVez = signal(true);
  readonly visibilidad = signal<VisibilidadEstados>('TODOS');
  readonly bloqueados = computed(() => this.svc.ajustes()?.bloqueados ?? []);
  readonly amigos = this.audiencia.mejoresAmigos;
  readonly restringidos = this.audiencia.restringidos;
  readonly nuevoAmigo = signal('');
  readonly nuevoRestringido = signal('');

  ngOnInit(): void {
    this.svc.cargar().subscribe({
      next: (datos) => {
        this.aplicar(datos);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.toast.show('No se pudieron cargar tus ajustes de privacidad.');
      }
    });

    this.audiencia.cargarMejoresAmigos().subscribe({ error: () => undefined });
    this.audiencia.cargarRestringidos().subscribe({ error: () => undefined });
  }

  agregarAmigo(): void {
    const id = this.nuevoAmigo().trim();

    if (!id) return;

    this.audiencia.agregarMejorAmigo(id).subscribe({
      next: () => {
        this.nuevoAmigo.set('');
        this.toast.show('Agregado a mejores amigos.');
      },
      error: () => this.toast.show('No se pudo agregar a esa persona.')
    });
  }

  quitarAmigo(usuarioId: string): void {
    this.audiencia.quitarMejorAmigo(usuarioId).subscribe({
      next: () => this.toast.show('Quitado de mejores amigos.'),
      error: () => this.toast.show('No se pudo quitar.')
    });
  }

  agregarRestringido(): void {
    const id = this.nuevoRestringido().trim();

    if (!id) return;

    this.audiencia.restringir(id).subscribe({
      next: () => {
        this.nuevoRestringido.set('');
        this.toast.show('Persona restringida.');
      },
      error: () => this.toast.show('No se pudo restringir a esa persona.')
    });
  }

  quitarRestringido(usuarioId: string): void {
    this.audiencia.quitarRestriccion(usuarioId).subscribe({
      next: () => this.toast.show('Restricción quitada.'),
      error: () => this.toast.show('No se pudo quitar la restricción.')
    });
  }

  elegirPresencia(valor: Presencia): void {
    this.presencia.set(valor);
    this.guardar({ presencia: valor });
  }

  cambiarUltimaVez(valor: boolean): void {
    this.mostrarUltimaVez.set(valor);
    this.guardar({ mostrarUltimaVez: valor });
  }

  elegirVisibilidad(valor: VisibilidadEstados): void {
    this.visibilidad.set(valor);
    this.guardar({ estadosVisibilidad: valor });
  }

  bloquear(): void {
    const id = this.nuevoBloqueo().trim();

    if (!id) return;

    this.svc.bloquear(id, this.alcanceNuevo()).subscribe({
      next: () => {
        this.nuevoBloqueo.set('');
        this.recargar();
        this.toast.show('Persona bloqueada.');
      },
      error: () => this.toast.show('No se pudo bloquear a esa persona.')
    });
  }

  desbloquear(usuarioId: string): void {
    this.svc.desbloquear(usuarioId).subscribe({
      next: () => {
        this.recargar();
        this.toast.show('Persona desbloqueada.');
      },
      error: () => this.toast.show('No se pudo desbloquear.')
    });
  }

  private guardar(cambios: Record<string, unknown>): void {
    this.guardando.set(true);

    this.svc.guardar(cambios).subscribe({
      next: (datos) => {
        this.aplicar(datos);
        this.guardando.set(false);
      },
      error: () => {
        this.guardando.set(false);
        this.toast.show('No se pudo guardar el cambio.');
      }
    });
  }

  private recargar(): void {
    this.svc.cargar().subscribe((datos) => this.aplicar(datos));
  }

  private aplicar(datos: { presencia: Presencia; mostrarUltimaVez: boolean; estadosVisibilidad: VisibilidadEstados }): void {
    this.presencia.set(datos.presencia);
    this.mostrarUltimaVez.set(datos.mostrarUltimaVez);
    this.visibilidad.set(datos.estadosVisibilidad);
  }
}
