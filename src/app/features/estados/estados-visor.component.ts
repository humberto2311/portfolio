import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EstadosService } from '../../core/services/estados.service';
import { Espectador, Estado, GrupoEstados } from '../../core/models/estado.model';
import { LogoComponent } from '../../shared/components/logo/logo.component';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-estados-visor',
  standalone: true,
  imports: [CommonModule, FormsModule, LogoComponent],
  templateUrl: './estados-visor.component.html',
  styleUrls: ['./estados-visor.component.scss']
})
export class EstadosVisorComponent implements OnInit, OnDestroy {

  private estados = inject(EstadosService);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly grupoInicial = input.required<GrupoEstados>({ alias: 'grupo' });
  readonly vecinos = input<GrupoEstados[]>([]);
  readonly cerrar = output<void>();
  readonly borrado = output<void>();

  readonly grupo = signal<GrupoEstados>({ usuarioId: '', nombre: '', avatar: null, todosVistos: false, total: 0, estados: [] });
  readonly indice = signal(0);
  readonly progreso = signal(0);
  readonly pausado = signal(false);
  readonly respuesta = signal('');
  readonly reaccion = signal<string | null>(null);

  readonly reacciones = ['❤️', '🔥', '👏', '😮', '😂', '🎯'];

  /** El ojo del autor: abre y cierra la lista de quienes vieron. */
  readonly viendoEspectadores = signal(false);
  readonly espectadores = signal<Espectador[]>([]);
  readonly cargandoEspectadores = signal(false);

  /** Solo el autor ve el ojo. */
  readonly esPropia = computed(() => !!this.actual()?.propio);

  readonly actual = computed<Estado | null>(() => this.grupo().estados[this.indice()] ?? null);

  /** Pausa o reanuda y, si se pausa, muestra quién la vio. */
  tocarOjo(): void {
    if (this.pausado()) {
      this.viendoEspectadores.set(false);
      this.pausado.set(false);
      this.reproducir();
      return;
    }

    this.pausado.set(true);
    this.detener();
    this.viendoEspectadores.set(true);
    this.cargarEspectadores();
  }

  /** "Hoy a las 11:05 PM", "Ayer a las 9:20 AM" o "12 mar, 3:40 PM". */
  cuandoVio(iso: string | null): string {
    if (!iso) return '';

    const fecha = new Date(iso);
    if (isNaN(fecha.getTime())) return '';

    const hora = fecha.toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit', hour12: true });
    const hoy = new Date();
    const dias = Math.floor((new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime()
      - new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime()) / 86400000);

    if (dias === 0) return `Hoy a las ${hora}`;
    if (dias === 1) return `Ayer a las ${hora}`;

    const dia = fecha.toLocaleDateString('es', { day: 'numeric', month: 'short' });

    return `${dia}, ${hora}`;
  }

  cargarEspectadores(): void {
    const estado = this.actual();
    if (!estado) return;

    this.cargandoEspectadores.set(true);
    this.estados.espectadores(estado.id).subscribe((gente) => {
      this.espectadores.set(gente);
      this.cargandoEspectadores.set(false);
    });
  }

  @ViewChild('cajaRespuesta') cajaRespuesta?: ElementRef<HTMLInputElement>;

  private temporizador: ReturnType<typeof setInterval> | null = null;
  private audio: HTMLAudioElement | null = null;

  readonly duracion = computed(() => this.actual()?.duracionSegundos ?? 10);
  readonly anterior = computed<GrupoEstados | null>(() => this.vecino(-1));
  readonly siguiente = computed<GrupoEstados | null>(() => this.vecino(1));

  ngOnInit(): void {
    this.grupo.set(this.grupoInicial());
    this.reproducir();
  }

  ngOnDestroy(): void {
    this.detener();
  }

  /** Escape cierra el visor. */
  @HostListener('document:keydown.escape')
  alPulsarEscape(): void {
    // Primero cierra la lista de quienes vieron; si ya está cerrada, sale del visor.
    if (this.viendoEspectadores()) {
      this.viendoEspectadores.set(false);
      return;
    }

    this.cerrar.emit();
  }

  /** Lleva al perfil del autor de la historia. */
  abrirPerfil(): void {
    const usuarioId = this.grupo().usuarioId;

    if (!usuarioId) return;

    this.detener();
    this.cerrar.emit();

    // Si venimos de dentro de la app (logueado), el perfil tiene que abrirse dentro
    // del layout privado para conservar el navbar. La ruta suelta `/perfil/:id`
    // vive fuera de él, y por eso el perfil salía sin barra superior.
    const dentroDeLaApp = this.router.url.startsWith('/app');

    void this.router.navigate(dentroDeLaApp ? ['/app/perfil', usuarioId] : ['/perfil', usuarioId]);
  }

  avanzar(): void {
    const siguiente = this.indice() + 1;

    if (siguiente >= this.grupo().estados.length) {
      this.cerrar.emit();
      return;
    }

    this.indice.set(siguiente);
    this.reproducir();
  }

  retroceder(): void {
    if (this.indice() === 0) {
      this.reproducir();
      return;
    }

    this.indice.set(this.indice() - 1);
    this.reproducir();
  }

  irA(grupo: GrupoEstados): void {
    this.grupo.set(grupo);
    this.indice.set(0);
    this.reproducir();
  }

  alternarPausa(): void {
    this.pausado.set(!this.pausado());

    if (this.pausado()) {
      this.pararTemporizador();
      this.audio?.pause();
    } else {
      this.arrancarTemporizador();
      this.audio?.play().catch(() => undefined);
    }
  }

  reaccionar(emoji: string): void {
    const estado = this.actual();

    if (!estado || estado.propio) return;

    this.reaccion.set(emoji);

    // La reacción viaja al chat del dueño; si falla se avisa y se deshace.
    this.estados.responder(estado.id, emoji, null).subscribe({
      next: () => this.toast.show('Reacción enviada'),
      error: () => {
        this.reaccion.set(null);
        this.toast.show('No se pudo enviar la reacción');
      }
    });
  }

  enviarRespuesta(): void {
    const estado = this.actual();
    const texto = this.respuesta().trim();

    if (!estado || estado.propio || !texto) return;

    const emoji = this.reaccion();

    this.respuesta.set('');

    this.estados.responder(estado.id, emoji, texto).subscribe({
      next: () => {
        this.reaccion.set('📩');
        this.toast.show('Respuesta enviada al chat');
      },
      error: () => {
        this.respuesta.set(texto);
        this.toast.show('No se pudo enviar la respuesta');
      }
    });
  }

  eliminar(): void {
    const estado = this.actual();

    if (!estado) return;

    this.estados.borrar(estado.id).subscribe(() => {
      this.pararTemporizador();
      this.borrado.emit();
      this.cerrar.emit();
    });
  }

  private vecino(salto: number): GrupoEstados | null {
    const lista = this.vecinos();

    if (!lista.length) return null;

    const posicion = lista.findIndex((grupo) => grupo.usuarioId === this.grupo().usuarioId);

    if (posicion < 0) return null;

    return lista[posicion + salto] ?? null;
  }

  private reproducir(): void {
    const estado = this.actual();

    this.detener();
    this.pausado.set(false);
    this.progreso.set(0);
    this.reaccion.set(null);

    if (!estado) return;

    if (!estado.vista && !estado.propio) {
      this.estados.marcarVista(estado.id).subscribe({ error: () => undefined });
    }

    this.sonarMusica(estado);
    this.arrancarTemporizador();
  }

  private sonarMusica(estado: Estado): void {
    if (!estado.musicaUrl) return;

    this.audio = new Audio(estado.musicaUrl);
    this.audio.currentTime = estado.musicaInicio ?? 0;
    this.audio.loop = true;
    this.audio.play().catch(() => undefined);
  }

  private arrancarTemporizador(): void {
    const paso = 100;
    const total = this.duracion() * 1000;

    this.temporizador = setInterval(() => {
      const siguiente = this.progreso() + (paso / total) * 100;

      if (siguiente >= 100) {
        this.progreso.set(100);
        this.avanzar();
        return;
      }

      this.progreso.set(siguiente);
    }, paso);
  }

  private pararTemporizador(): void {
    if (this.temporizador) {
      clearInterval(this.temporizador);
      this.temporizador = null;
    }
  }

  private detener(): void {
    this.pararTemporizador();

    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
  }
}
