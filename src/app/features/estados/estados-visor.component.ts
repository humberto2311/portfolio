import { Component, OnDestroy, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstadosService } from '../../core/services/estados.service';
import { Estado, GrupoEstados } from '../../core/models/estado.model';

@Component({
  selector: 'app-estados-visor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estados-visor.component.html',
  styleUrls: ['./estados-visor.component.scss']
})
export class EstadosVisorComponent implements OnInit, OnDestroy {

  private estados = inject(EstadosService);

  readonly grupoInicial = input.required<GrupoEstados>({ alias: 'grupo' });
  readonly grupo = signal<GrupoEstados>({ usuarioId: '', nombre: '', avatar: null, todosVistos: false, total: 0, estados: [] });
  readonly cerrar = output<void>();
  readonly borrado = output<void>();

  readonly indice = signal(0);
  readonly progreso = signal(0);
  readonly pausado = signal(false);

  private temporizador: ReturnType<typeof setInterval> | null = null;
  private audio: HTMLAudioElement | null = null;

  readonly actual = computed<Estado | null>(() => this.grupo().estados[this.indice()] ?? null);
  readonly duracion = computed(() => this.actual()?.duracionSegundos ?? 10);

  ngOnInit(): void {
    this.grupo.set(this.grupoInicial());
    this.reproducir();
  }

  ngOnDestroy(): void {
    this.detener();
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

  eliminar(): void {
    const estado = this.actual();

    if (!estado) return;

    this.estados.borrar(estado.id).subscribe(() => {
      this.pararTemporizador();
      this.borrado.emit();
      this.cerrar.emit();
    });
  }

  private reproducir(): void {
    const estado = this.actual();

    this.detener();
    this.pausado.set(false);
    this.progreso.set(0);

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
