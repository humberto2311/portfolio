import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CoachCambioCv, CoachMensaje, CoachVacante } from '../../core/models/coach-cv.model';
import { GraficoCv, Vacante } from '../../core/models/empleo.model';
import { CoachCvService } from '../../core/services/coach-cv.service';
import { CvUsuarioService } from '../../core/services/cv-usuario.service';

/**
 * Chat con IA dentro de "Buscar empleo".
 * Se alimenta solo: recibe las estadísticas del CV (el gráfico) y las vacantes que
 * están en pantalla, y con eso responde qué mejorar. Si el usuario dice "sí",
 * el backend guarda los cambios en su hoja de vida.
 */
@Component({
  selector: 'app-empleo-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './empleo-chat.component.html',
  styleUrls: ['./empleo-chat.component.scss'],
})
export class EmpleoChatComponent {
  private svc = inject(CoachCvService);
  private cv = inject(CvUsuarioService);

  @ViewChild('hilo') hilo?: ElementRef<HTMLDivElement>;

  readonly grafico = input<GraficoCv | null>(null);
  readonly vacantes = input<Vacante[]>([]);
  readonly iaDisponible = input<boolean>(true);

  readonly mensajes = signal<CoachMensaje[]>([]);
  readonly escribiendo = signal(false);
  readonly error = signal<string | null>(null);
  readonly texto = signal('');
  readonly cvListo = signal(false);
  readonly propuestaPendiente = signal<CoachCambioCv | null>(null);

  readonly sugeridas = [
    '¿Qué debo mejorar en mi hoja de vida?',
    '¿Qué me falta para estas vacantes?',
    '¿Cómo subo mi porcentaje de acierto?',
  ];

  readonly hayPropuesta = computed(() => this.propuestaPendiente() !== null);
  readonly cargando = computed(() => this.escribiendo() && this.mensajes().length === 0);

  constructor() {
    this.abrir();
  }

  /** Primer mensaje: la IA abre con el diagnóstico de su CV y sus vacantes. */
  private abrir(): void {
    if (!this.mensajes().length) {
      this.enviar('¿Qué debo mejorar en mi hoja de vida para estas vacantes?', true);
    }
  }

  preguntar(texto: string): void {
    const limpio = (texto ?? '').trim();
    if (!limpio || this.escribiendo()) return;
    this.texto.set('');
    this.enviar(limpio, false);
  }

  enviarSugerida(texto: string): void {
    this.preguntar(texto);
  }

  /** El usuario acepta: se acomoda la información en su CV. */
  aceptar(): void {
    if (this.escribiendo()) return;
    this.enviar('Sí', false, true);
  }

  /** El usuario no quiere cambios: se descarta la propuesta. */
  rechazar(): void {
    this.propuestaPendiente.set(null);
    this.preguntar('No, por ahora solo dame recomendaciones');
  }

  onEnter(evento: Event): void {
    const teclado = evento as KeyboardEvent;
    if (teclado.shiftKey) return;
    evento.preventDefault();
    this.preguntar(this.texto());
  }

  private enviar(texto: string, silencioso: boolean, aplicar = false): void {
    const hora = this.hora();

    if (!silencioso) {
      this.mensajes.update((lista) => [...lista, { autor: 'yo', texto, hora }]);
    }

    this.escribiendo.set(true);
    this.error.set(null);

    this.svc
      .conversar({
        preguntas: [texto],
        vacantes: this.vacantesParaIa(),
        aplicar,
      })
      .subscribe({
        next: (respuesta) => {
          this.escribiendo.set(false);

          if (aplicar && respuesta?.aplicado) {
            this.cvListo.set(true);
            this.propuestaPendiente.set(null);
          } else if (!aplicar) {
            this.propuestaPendiente.set(respuesta?.propuesta ?? null);
          }

          this.mensajes.update((lista) => [
            ...lista,
            {
              autor: 'ia',
              texto: respuesta?.respuesta || 'No pude leer tu hoja de vida todavía.',
              hora: this.hora(),
              mejoras: respuesta?.mejoras ?? [],
              propuesta: aplicar ? null : respuesta?.propuesta ?? null,
            },
          ]);

          this.bajar();
        },
        error: (err) => {
          this.escribiendo.set(false);
          this.error.set(err?.error?.error ?? 'No se pudo hablar con el asistente. Intenta de nuevo.');
        },
      });
  }

  private vacantesParaIa(): CoachVacante[] {
    return (this.vacantes() ?? []).slice(0, 8).map((vacante) => ({
      cargo: vacante.cargo,
      empresa: vacante.empresa ?? null,
      puntaje: vacante.puntaje ?? 0,
      faltantes: vacante.faltantes ?? [],
    }));
  }

  private bajar(): void {
    setTimeout(() => {
      const caja = this.hilo?.nativeElement;
      if (caja) caja.scrollTop = caja.scrollHeight;
    }, 40);
  }

  private hora(): string {
    return new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  indice(): number {
    return this.grafico()?.indiceGeneral ?? 0;
  }

  totalVacantes(): number {
    return this.vacantes()?.length ?? 0;
  }

  /** Nombre y titular que salen de su propia hoja de vida. */
  nombreCv(): string {
    const perfil = this.cv.perfil();
    return perfil?.fullName || perfil?.headline || 'Tu hoja de vida';
  }

  enlaceCv(): string {
    return this.cv.enlaceHojaDeVida();
  }
}
