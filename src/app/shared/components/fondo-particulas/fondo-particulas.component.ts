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
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TemaService } from '../../../core/services/tema.service';

interface Particula {
  x: number;
  y: number;
  bx: number;
  by: number;
  vx: number;
  vy: number;
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly plataforma = inject(PLATFORM_ID);
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));

  private ctx: CanvasRenderingContext2D | null = null;
  private particulas: Particula[] = [];
  private cuadro = 0;
  private ancho = 0;
  private alto = 0;
  private radio = 0;
  private puntero = { x: -9999, y: -9999, activo: false };
  private reductor: MediaQueryList | null = null;

  private readonly separacion = 26;
  private readonly empuje = 120;
  private readonly suavizado = 0.09;

  private observar?: ResizeObserver;

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
    const paso = compacto ? this.separacion * 1.9 : this.separacion;

    this.radio = compacto ? 0.9 : 1.25;

    const columnas = Math.max(Math.floor(this.ancho / paso), 1);
    const filas = Math.max(Math.floor(this.alto / paso), 1);
    const margenX = (this.ancho - (columnas - 1) * paso) / 2;
    const margenY = (this.alto - (filas - 1) * paso) / 2;

    this.particulas = [];

    for (let fila = 0; fila < filas; fila++) {
      for (let columna = 0; columna < columnas; columna++) {
        const x = margenX + columna * paso;
        const y = margenY + fila * paso;

        this.particulas.push({ x, y, bx: x, by: y, vx: 0, vy: 0 });
      }
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

    ctx.clearRect(0, 0, this.ancho, this.alto);
    ctx.fillStyle = this.tema.claro() ? 'rgba(37, 64, 105, 0.30)' : 'rgba(150, 190, 245, 0.26)';

    const quieto = this.reductor?.matches ?? false;
    const seguir = !quieto && this.puntero.activo;
    const alcance = this.empuje;
    const alcance2 = alcance * alcance;

    for (const p of this.particulas) {
      if (seguir) {
        const dx = p.bx - this.puntero.x;
        const dy = p.by - this.puntero.y;
        const distancia2 = dx * dx + dy * dy;

        if (distancia2 < alcance2) {
          const distancia = Math.sqrt(distancia2) || 0.001;
          const fuerza = (1 - distancia / alcance) * 26;

          p.vx += (dx / distancia) * fuerza * 0.12;
          p.vy += (dy / distancia) * fuerza * 0.12;
        }
      }

      p.vx += (p.bx - p.x) * this.suavizado;
      p.vy += (p.by - p.y) * this.suavizado;
      p.vx *= 0.86;
      p.vy *= 0.86;
      p.x += p.vx;
      p.y += p.vy;

      ctx.beginPath();
      ctx.arc(p.x, p.y, this.radio, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private pintarTodo(): void {
    if (!this.ctx) return;

    this.dibujar();
  }
}
