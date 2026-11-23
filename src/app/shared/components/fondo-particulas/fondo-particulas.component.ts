import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  effect,
  inject
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TemaService } from '../../../core/services/tema.service';

interface Particula {
  x: number;
  y: number;
  bx: number;
  by: number;
  vx: number;
  vy: number;
  angulo: number;
  largo: number;
  tono: number;
  radio: number;
}

@Component({
  selector: 'app-fondo-particulas',
  standalone: true,
  template: '<canvas #lienzo aria-hidden="true"></canvas>',
  styleUrl: './fondo-particulas.component.scss'
})
export class FondoParticulasComponent implements AfterViewInit, OnDestroy {

  @ViewChild('lienzo', { static: true }) lienzo!: ElementRef<HTMLCanvasElement>;

  private readonly zona = inject(NgZone);
  private readonly tema = inject(TemaService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));

  private ctx: CanvasRenderingContext2D | null = null;
  private particulas: Particula[] = [];
  private cuadro = 0;
  private ancho = 0;
  private alto = 0;
  private puntero = { x: -9999, y: -9999, activo: false };
  private reductor: MediaQueryList | null = null;
  private observar?: ResizeObserver;

  private readonly empuje = 150;
  private readonly suavizado = 0.075;

  constructor() {
    effect(() => {
      this.tema.claro();
      this.pintarTodo();
    });
  }

  ngAfterViewInit(): void {
    if (!this.navegador) return;

    this.zona.runOutsideAngular(() => {
      this.ctx = this.lienzo.nativeElement.getContext('2d');

      if (!this.ctx) return;

      this.reductor = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.observar = new ResizeObserver(() => this.medir());

      this.observar.observe(this.host.nativeElement);
      this.medir();
      this.engancharEventos();
      this.bucle();
    });
  }

  ngOnDestroy(): void {
    if (!this.navegador) return;

    cancelAnimationFrame(this.cuadro);
    this.observar?.disconnect();
    this.soltarEventos();
  }

  private readonly alMover = (evento: PointerEvent) => {
    if (evento.pointerType === 'touch') return;

    const caja = this.lienzo.nativeElement.getBoundingClientRect();

    this.puntero.x = evento.clientX - caja.left;
    this.puntero.y = evento.clientY - caja.top;
    this.puntero.activo = true;
  };

  private readonly alSalir = () => {
    this.puntero.activo = false;
    this.puntero.x = -9999;
    this.puntero.y = -9999;
  };

  private readonly alRedimensionar = () => this.medir();

  private engancharEventos(): void {
    const ventana = this.host.nativeElement.ownerDocument.defaultView ?? window;

    ventana.addEventListener('pointermove', this.alMover, { passive: true });
    ventana.addEventListener('pointerleave', this.alSalir, { passive: true });
    ventana.addEventListener('resize', this.alRedimensionar, { passive: true });
  }

  private soltarEventos(): void {
    const ventana = this.host.nativeElement.ownerDocument.defaultView ?? window;

    ventana.removeEventListener('pointermove', this.alMover);
    ventana.removeEventListener('pointerleave', this.alSalir);
    ventana.removeEventListener('resize', this.alRedimensionar);
  }

  private medir(): void {
    const lienzo = this.lienzo?.nativeElement;
    if (!lienzo) return;

    const caja = this.host.nativeElement.getBoundingClientRect();
    const proporcion = Math.min(window.devicePixelRatio || 1, 2);

    this.ancho = Math.max(caja.width, 1);
    this.alto = Math.max(caja.height, 1);

    lienzo.width = Math.floor(this.ancho * proporcion);
    lienzo.height = Math.floor(this.alto * proporcion);
    lienzo.style.width = `${this.ancho}px`;
    lienzo.style.height = `${this.alto}px`;

    this.ctx?.setTransform(proporcion, 0, 0, proporcion, 0, 0);

    this.crearParticulas();
    this.pintarTodo();
  }

  private crearParticulas(): void {
    const compacto = this.ancho < 700;
    const cantidad = compacto
      ? Math.round((this.ancho * this.alto) / 21000)
      : Math.round((this.ancho * this.alto) / 9500);
    const centroX = this.ancho * 0.5;
    const centroY = this.alto * 0.45;
    const alcance = Math.hypot(this.ancho, this.alto) * 0.62;

    this.particulas = [];

    for (let i = 0; i < cantidad; i++) {
      const radial = i % 3 !== 0;
      let x: number;
      let y: number;

      if (radial) {
        const angulo = Math.random() * Math.PI * 2;
        const distancia = Math.pow(Math.random(), 0.6) * alcance;
        const elipse = compacto ? 0.72 : 1.15;

        x = centroX + Math.cos(angulo) * distancia * elipse;
        y = centroY + Math.sin(angulo) * distancia * 0.62;
      } else {
        x = Math.random() * this.ancho;
        y = Math.random() * this.alto;
      }

      x = Math.min(Math.max(x, 6), this.ancho - 6);
      y = Math.min(Math.max(y, 6), this.alto - 6);

      const direccion = Math.atan2(y - centroY, x - centroX);

      this.particulas.push({
        x,
        y,
        bx: x,
        by: y,
        vx: 0,
        vy: 0,
        angulo: direccion + Math.PI / 2,
        largo: compacto ? 2.4 + Math.random() * 1.6 : 4 + Math.random() * 4.5,
        tono: Math.random(),
        radio: compacto ? 0.7 : 1
      });
    }
  }

  private bucle = (): void => {
    this.cuadro = requestAnimationFrame(this.bucle);
    this.dibujar();
  };

  private dibujar(): void {
    if (!this.navegador) return;

    const ctx = this.ctx;
    if (!ctx) return;

    const claro = this.tema.claro();
    const quieto = this.reductor?.matches ?? false;
    const seguir = !quieto && this.puntero.activo;
    const alcance2 = this.empuje * this.empuje;

    ctx.clearRect(0, 0, this.ancho, this.alto);
    ctx.lineCap = 'round';

    for (const p of this.particulas) {
      let fuerza = 0;

      if (seguir) {
        const dx = p.bx - this.puntero.x;
        const dy = p.by - this.puntero.y;
        const distancia2 = dx * dx + dy * dy;

        if (distancia2 < alcance2) {
          const distancia = Math.sqrt(distancia2) || 0.001;
          const cercania = 1 - distancia / this.empuje;

          fuerza = cercania;
          p.vx += (dx / distancia) * cercania * 5.5;
          p.vy += (dy / distancia) * cercania * 5.5;
        }
      }

      p.vx += (p.bx - p.x) * this.suavizado;
      p.vy += (p.by - p.y) * this.suavizado;
      p.vx *= 0.9;
      p.vy *= 0.9;
      p.x += p.vx;
      p.y += p.vy;

      const velocidad = Math.hypot(p.vx, p.vy);
      const giro = Math.atan2(p.vy, p.vx);
      const orientado = velocidad > 0.12;
      const angulo = orientado ? giro : p.angulo;
      const largo = p.largo * (1 + Math.min(velocidad * 0.22, 2.4) + fuerza * 0.6);

      const alfa = Math.min(0.16 + fuerza * 0.72 + p.tono * 0.18, 0.9);
      const color = claro
        ? (p.tono > 0.55 ? `rgba(58, 92, 168, ${alfa * 0.85})` : `rgba(74, 158, 255, ${alfa * 0.8})`)
        : (p.tono > 0.6
            ? `rgba(139, 148, 255, ${alfa})`
            : p.tono > 0.3
              ? `rgba(96, 165, 250, ${alfa})`
              : `rgba(196, 214, 255, ${alfa * 0.9})`);

      const medio = largo / 2;

      ctx.strokeStyle = color;
      ctx.lineWidth = p.radio + (fuerza > 0.35 ? 0.45 : 0);
      ctx.beginPath();
      ctx.moveTo(p.x - Math.cos(angulo) * medio, p.y - Math.sin(angulo) * medio);
      ctx.lineTo(p.x + Math.cos(angulo) * medio, p.y + Math.sin(angulo) * medio);
      ctx.stroke();
    }
  }

  private pintarTodo(): void {
    if (!this.ctx) return;

    this.dibujar();
  }
}
