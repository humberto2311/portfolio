import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ZumbidoService {
  private readonly documento = inject(DOCUMENT);

  private readonly COOLDOWN = 12;
  private readonly ESPERA_RECEPCION = 15;

  readonly espera = signal(0);
  readonly ultimo = signal<{ deMi: boolean; nombre: string } | null>(null);

  private temporizador: ReturnType<typeof setInterval> | null = null;
  private contexto: AudioContext | null = null;
  private ultimoRecibido = 0;

  get enEspera(): boolean {
    return this.espera() > 0;
  }

  enviar(nombreDestino: string): void {
    if (this.espera() > 0) return;

    this.sacudir();
    this.sonar();
    this.ultimo.set({ deMi: true, nombre: nombreDestino });
    this.arrancarEspera();
  }

  recibir(nombre: string): void {
    const ahora = Date.now();

    if (ahora - this.ultimoRecibido < this.ESPERA_RECEPCION * 1000) return;
    this.ultimoRecibido = ahora;

    this.sacudir();
    this.sonar();
    this.ultimo.set({ deMi: false, nombre });
  }

  private arrancarEspera(): void {
    this.espera.set(this.COOLDOWN);

    if (this.temporizador) clearInterval(this.temporizador);

    this.temporizador = setInterval(() => {
      const siguiente = this.espera() - 1;
      this.espera.set(siguiente > 0 ? siguiente : 0);

      if (siguiente <= 0 && this.temporizador) {
        clearInterval(this.temporizador);
        this.temporizador = null;
      }
    }, 1000);
  }

  private sacudir(): void {
    const raiz = this.documento.querySelector('.chat-panel, .side-panel');
    if (!raiz) return;

    raiz.classList.remove('zumbido-sacudida');
    void (raiz as HTMLElement).offsetWidth;
    raiz.classList.add('zumbido-sacudida');

    setTimeout(() => raiz.classList.remove('zumbido-sacudida'), 700);
  }

  private sonar(): void {
    const Ventana = this.documento.defaultView as unknown as {
      AudioContext?: new () => AudioContext;
      webkitAudioContext?: new () => AudioContext;
    } | null;

    const Clase = Ventana?.AudioContext ?? Ventana?.webkitAudioContext;
    if (!Clase) return;

    this.contexto = this.contexto ?? new Clase();

    const ctx: AudioContext | null = this.contexto;
    if (!ctx) return;
    const ahora = ctx.currentTime;

    const oscilador = ctx.createOscillator();
    const volumen = ctx.createGain();

    oscilador.type = 'sawtooth';
    oscilador.frequency.setValueAtTime(78, ahora);
    oscilador.frequency.linearRampToValueAtTime(52, ahora + 0.12);
    oscilador.frequency.setValueAtTime(96, ahora + 0.16);
    oscilador.frequency.linearRampToValueAtTime(44, ahora + 0.3);

    volumen.gain.setValueAtTime(0.0001, ahora);
    volumen.gain.exponentialRampToValueAtTime(0.28, ahora + 0.02);
    volumen.gain.exponentialRampToValueAtTime(0.0001, ahora + 0.42);

    oscilador.connect(volumen).connect(ctx.destination);
    oscilador.start(ahora);
    oscilador.stop(ahora + 0.45);
  }
}
