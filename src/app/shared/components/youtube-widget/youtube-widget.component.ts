import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { YouTubeService, VideoYouTube } from '../../../core/services/youtube.service';

declare const YT: any;

interface Posicion {
  x: number;
  y: number;
}

@Component({
  selector: 'app-youtube-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './youtube-widget.component.html',
  styleUrls: ['./youtube-widget.component.scss']
})
export class YouTubeWidgetComponent implements OnInit {

  @ViewChild('marco') marco?: ElementRef<HTMLIFrameElement>;
  @ViewChild('hueco') hueco?: ElementRef<HTMLElement>;

  private youtube = inject(YouTubeService);
  private destroyRef = inject(DestroyRef);
  private sanitizer = inject(DomSanitizer);

  readonly estado = this.youtube.estado;
  readonly minimizado = signal(false);
  readonly cerrado = signal(false);
  readonly ocupado = signal(false);
  readonly consulta = signal('');
  readonly resultados = signal<VideoYouTube[]>([]);
  readonly buscando = signal(false);

  readonly posicion = signal<Posicion | null>(null);
  readonly marcoCaja = signal<{ x: number; y: number; ancho: number } | null>(null);

  readonly video = computed(() => this.estado().video);
  readonly sonando = computed(() => this.estado().sonando && !!this.video());
  readonly hayAlgo = computed(() => !!this.video());
  readonly visible = computed(() => !!this.video() && !this.cerrado());

  readonly origen = `${window.location.origin}`;
  /**
   * Angular bloquea un texto plano en el [src] de un iframe (NG0904) y el video no cargaba.
   * Solo se marca como seguro después de comprobar que el id tiene el formato de YouTube,
   * así nadie puede colar otra URL en el reproductor.
   */
  readonly fuente = computed<SafeResourceUrl | null>(() => {
    const actual = this.video();
    if (!actual || !/^[A-Za-z0-9_-]{11}$/.test(actual.id)) return null;

    const url = `https://www.youtube.com/embed/${actual.id}?autoplay=1&rel=0&playsinline=1&enablejsapi=1`
      + `&origin=${encodeURIComponent(this.origen)}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  private reproductor: any = null;
  private temporizador: ReturnType<typeof setInterval> | null = null;
  private apiLista: Promise<void> | null = null;
  private arrastrando = false;
  private desde = { x: 0, y: 0 };
  private origenArrastre = { x: 0, y: 0 };

  ngOnInit(): void {
    this.seguirHueco();
    window.addEventListener('resize', this.seguirHueco);

    this.destroyRef.onDestroy(() => {
      window.removeEventListener('resize', this.seguirHueco);
      if (this.temporizador) clearInterval(this.temporizador);
    });

    this.temporizador = setInterval(this.seguirHueco, 250);

    this.youtube.actual().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (estado) => {
        if (!estado.video) return;
        this.cerrado.set(false);
        this.engancharReactor();
      },
      error: () => {}
    });

  }

  alternar(): void {
    // Minimizar NO toca el reproductor: el marco solo se encoge y el audio sigue.
    this.minimizado.update((v) => !v);
    setTimeout(this.seguirHueco, 30);
  }

  buscar(): void {
    const texto = this.consulta().trim();
    if (!texto || this.buscando()) return;

    this.buscando.set(true);
    this.youtube.buscar(texto, 6)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lista) => {
          this.resultados.set(lista);
          this.buscando.set(false);
        },
        error: () => {
          this.resultados.set([]);
          this.buscando.set(false);
        }
      });
  }

  poner(video: VideoYouTube): void {
    this.resultados.set([]);
    this.minimizado.set(false);
    this.youtube.play(video.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  alternarSonido(): void {
    if (this.sonando()) {
      this.pausar();
    } else {
      this.reanudar();
    }
  }

  pausar(): void {
    this.aplicarEstado(false);
    this.youtube.pausar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  reanudar(): void {
    this.aplicarEstado(true);
    this.youtube.reanudar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  saltar(): void {
    this.youtube.saltar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  detener(): void {
    this.aplicarEstado(false);
    this.youtube.detener().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.cerrar()
    });
  }

  cerrar(): void {
    this.cerrado.set(true);
    this.minimizado.set(false);
  }

  reabrir(): void {
    this.cerrado.set(false);
    setTimeout(this.seguirHueco, 30);
  }

  /**
   * El marco del video es fijo y siempre está montado; su posición se copia del
   * hueco que deja la ventana. Así minimizar solo lo encoge: el audio no se corta.
   */
  private seguirHueco = (): void => {
    const hueco = this.hueco?.nativeElement;
    if (!hueco) return;

    const caja = hueco.getBoundingClientRect();
    if (!caja.width) return;

    const actual = this.marcoCaja();
    if (actual && Math.abs(actual.x - caja.left) < 1 && Math.abs(actual.y - caja.top) < 1
      && Math.abs(actual.ancho - caja.width) < 1) {
      return;
    }

    this.marcoCaja.set({ x: caja.left, y: caja.top, ancho: caja.width });
  };

  // ---------- Arrastre de la ventana flotante ----------

  empezarArrastre(evento: PointerEvent): void {
    const objetivo = evento.target as HTMLElement;
    if (objetivo.closest('button, input, a, iframe')) return;

    const caja = (evento.currentTarget as HTMLElement).getBoundingClientRect();
    this.origenArrastre = { x: caja.left, y: caja.top };
    this.desde = { x: evento.clientX, y: evento.clientY };
    this.arrastrando = true;

    (evento.currentTarget as HTMLElement).setPointerCapture?.(evento.pointerId);
    evento.preventDefault();
  }

  moverArrastre(evento: PointerEvent): void {
    if (!this.arrastrando) return;

    const ancho = window.innerWidth;
    const alto = window.innerHeight;

    const x = Math.min(Math.max(8, this.origenArrastre.x + (evento.clientX - this.desde.x)), ancho - 120);
    const y = Math.min(Math.max(8, this.origenArrastre.y + (evento.clientY - this.desde.y)), alto - 80);

    this.posicion.set({ x, y });
    this.seguirHueco();
  }

  soltarArrastre(): void {
    this.arrastrando = false;
  }

  // ---------- Control real del reproductor incrustado ----------

  /** Tras cambiar de video, el mismo marco carga otro contenido: hay que reenganchar la API. */
  private engancharReactor(): void {
    this.reproductor = null;
    setTimeout(() => this.aplicarEstado(this.sonando()), 700);
  }

  private aplicarEstado(sonando: boolean): void {
    if (!this.marco?.nativeElement) return;

    this.conReproductor((reproductor) => {
      if (sonando) {
        reproductor.playVideo();
      } else {
        reproductor.pauseVideo();
      }
    });
  }

  private conReproductor(accion: (reproductor: any) => void): void {
    this.prepararApi().then(() => {
      if (!this.reproductor) {
        const marco = this.marco?.nativeElement;
        if (!marco) return;

        this.reproductor = new YT.Player(marco, {
          events: {
            onReady: () => accion(this.reproductor)
          }
        });
        return;
      }

      accion(this.reproductor);
    }).catch(() => {});
  }

  private prepararApi(): Promise<void> {
    if (this.apiLista) return this.apiLista;

    this.apiLista = new Promise<void>((resolver) => {
      if (typeof YT !== 'undefined' && YT.Player) {
        resolver();
        return;
      }

      const anterior = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (typeof anterior === 'function') anterior();
        resolver();
      };

      if (!document.getElementById('yt-iframe-api')) {
        const script = document.createElement('script');
        script.id = 'yt-iframe-api';
        script.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(script);
      }
    });

    return this.apiLista;
  }
}
