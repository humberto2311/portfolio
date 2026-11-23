import {
  Component,
  DestroyRef,
  ElementRef,
  Input,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, interval, of, startWith, switchMap } from 'rxjs';
import { PistaSpotify } from '../../../core/models/spotify.model';
import { ErrorSpotify, SpotifyService } from '../../../core/services/spotify.service';

export type ContextoSpotify = 'sidebar' | 'profile';

@Component({
  selector: 'app-spotify-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spotify-widget.component.html',
  styleUrls: ['./spotify-widget.component.scss']
})
export class SpotifyWidgetComponent implements OnInit {

  @Input() isOwner = false;
  @Input() username: string | null = null;
  @Input() modoPublico = true;
  @Input() contexto: ContextoSpotify = 'sidebar';

  readonly soloEnReproduccion = input(false);
  readonly compacto = input(false);
  readonly alConectar = output<void>();
  readonly alDesconectar = output<void>();

  private spotify = inject(SpotifyService);
  private destroyRef = inject(DestroyRef);
  private host = inject(ElementRef<HTMLElement>);

  private readonly SEGUNDOS_ESTADO = 6;

  readonly pista = signal<PistaSpotify | null>(null);
  readonly sonando = signal(false);
  readonly conectado = signal(false);
  readonly cargando = signal(true);
  readonly error = signal<ErrorSpotify | null>(null);
  readonly popoverAbierto = signal(false);
  readonly ocupado = signal(false);

  readonly titulo = computed(() => this.pista()?.nombre ?? 'Sin música');
  readonly subtitulo = computed(() => this.pista()?.artistas ?? '');
  readonly caratula = computed(() => this.pista()?.imagenUrl ?? null);
  readonly enlace = computed(() => this.pista()?.url ?? 'https://open.spotify.com');
  readonly reproduciendo = computed(() => this.conectado() && this.sonando() && !!this.pista());
  readonly visible = computed(() => this.isOwner || this.modoPublico);
  readonly mostrar = computed(() => this.visible() && (!this.soloEnReproduccion() || this.reproduciendo()));
  readonly etiquetaEstado = computed(() => this.sonando() ? 'Reproduciendo en Spotify' : 'Spotify conectado');

  private cerrarPorFuera = (evento: MouseEvent) => {
    if (!this.popoverAbierto()) return;

    const destino = evento.target as Node | null;
    if (destino && this.host.nativeElement.contains(destino)) return;

    this.popoverAbierto.set(false);
  };

  private cerrarConEscape = (evento: KeyboardEvent) => {
    if (evento.key === 'Escape' && this.popoverAbierto()) {
      this.popoverAbierto.set(false);
    }
  };

  ngOnInit(): void {
    if (!this.visible()) {
      this.cargando.set(false);
      return;
    }

    if (this.isOwner) {
      this.consultarEstado();
    } else if (this.username) {
      this.consultarEstadoPublico();
    } else {
      this.cargando.set(false);
    }

    document.addEventListener('click', this.cerrarPorFuera, true);
    document.addEventListener('keydown', this.cerrarConEscape);
  }

  alternarPopover(): void {
    if (!this.isOwner) return;

    this.popoverAbierto.update((abierto) => !abierto);

    if (this.popoverAbierto()) this.consultarEstado();
  }

  conectar(): void {
    this.ocupado.set(true);

    this.spotify.getUrlConexion()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ url }) => {
          this.ocupado.set(false);
          this.alConectar.emit();
          window.location.href = url;
        },
        error: (fallo) => {
          this.ocupado.set(false);
          this.error.set(this.spotify.comoError(fallo));
        }
      });
  }

  desconectar(): void {
    this.spotify.desconectar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.conectado.set(false);
          this.pista.set(null);
          this.sonando.set(false);
          this.popoverAbierto.set(false);
          this.alDesconectar.emit();
        },
        error: (fallo) => this.error.set(this.spotify.comoError(fallo))
      });
  }

  alternarReproduccion(): void {
    this.ejecutar(this.sonando() ? this.spotify.pausar() : this.spotify.reproducir());
  }

  anterior(): void {
    this.ejecutar(this.spotify.anterior());
  }

  siguiente(): void {
    this.ejecutar(this.spotify.siguiente());
  }

  abrirSpotify(evento: Event): void {
    evento.stopPropagation();
    window.open(this.enlace(), '_blank', 'noopener');
  }

  descartarError(): void {
    this.error.set(null);
  }

  private ejecutar(peticion: ReturnType<SpotifyService['pausar']>): void {
    if (this.ocupado()) return;

    this.ocupado.set(true);

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.ocupado.set(false);
        this.error.set(null);
        this.consultarEstado();
      },
      error: (fallo) => {
        this.ocupado.set(false);
        this.error.set(this.spotify.comoError(fallo));
      }
    });
  }

  private consultarEstado(): void {
    interval(this.SEGUNDOS_ESTADO * 1000)
      .pipe(
        startWith(0),
        switchMap(() => this.spotify.getEstadoActual().pipe(catchError(() => of(null)))),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((estado) => {
        this.cargando.set(false);
        if (!estado) return;
        this.aplicarEstado(estado);
      });
  }

  private consultarEstadoPublico(): void {
    const usuario = this.username;
    if (!usuario) return;

    interval(this.SEGUNDOS_ESTADO * 1000)
      .pipe(
        startWith(0),
        switchMap(() => this.spotify.getEstadoPublico(usuario).pipe(catchError(() => of(null)))),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((estado) => {
        this.cargando.set(false);
        if (!estado) return;
        this.aplicarEstado(estado);
      });
  }

  private aplicarEstado(estado: { conectado: boolean; sonando: boolean; pista: PistaSpotify | null }): void {
    this.conectado.set(estado.conectado || !!estado.pista);
    this.sonando.set(estado.sonando);
    this.pista.set(estado.pista ?? null);
  }
}
