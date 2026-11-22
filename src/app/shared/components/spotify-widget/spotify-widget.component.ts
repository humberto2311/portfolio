import {
  Component,
  DestroyRef,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { catchError, interval, of, startWith, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PistaSpotify } from '../../../core/models/spotify.model';
import { ErrorSpotify, SpotifyService } from '../../../core/services/spotify.service';

@Component({
  selector: 'app-spotify-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './spotify-widget.component.html',
  styleUrls: ['./spotify-widget.component.scss']
})
export class SpotifyWidgetComponent implements OnInit, OnDestroy {
  @Input() isOwner = false;
  @Input() username: string | null = null;
  @Input() modoPublico = true;
  @Input() compacto = false;

  private spotify = inject(SpotifyService);
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);
  private host = inject(ElementRef<HTMLElement>);

  private readonly SEGUNDOS_ESTADO = 6;
  private readonly SEGUNDOS_BUSQUEDA = 450;
  private readonly CLAVE_SESION = 'nfsocial.spotify.estado';

  readonly pista = signal<PistaSpotify | null>(null);
  readonly sonando = signal(false);
  readonly conectado = signal(false);
  readonly cargando = signal(true);
  readonly error = signal<ErrorSpotify | null>(null);
  readonly panelAbierto = signal(false);
  readonly ocupado = signal(false);

  readonly consulta = signal('');
  readonly resultados = signal<PistaSpotify[]>([]);
  readonly buscando = signal(false);
  readonly sinResultados = signal(false);

  readonly titulo = computed(() => this.pista()?.nombre ?? 'Sin música');
  readonly subtitulo = computed(() => this.pista()?.artistas ?? '');
  readonly caratula = computed(() => this.pista()?.imagenUrl ?? null);
  readonly hayResultados = computed(() => this.resultados().length > 0);
  readonly visible = computed(() => this.isOwner || this.modoPublico);

  private ultimaBusqueda = 0;
  private idBusqueda = 0;
  private cerrarPorFuera = (evento: MouseEvent) => {
    if (!this.panelAbierto()) return;
    const destino = evento.target as Node | null;
    if (destino && this.host.nativeElement.contains(destino)) return;
    this.panelAbierto.set(false);
  };

  ngOnInit(): void {
    if (!this.visible()) {
      this.cargando.set(false);
      return;
    }

    if (this.isOwner) {
      this.escucharRetorno();
      this.consultarEstado();
    } else if (this.username) {
      this.consultarEstadoPublico();
    } else {
      this.cargando.set(false);
    }

    document.addEventListener('click', this.cerrarPorFuera, true);
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.cerrarPorFuera, true);
  }

  alternarPanel(): void {
    if (!this.isOwner) return;
    this.panelAbierto.update((abierto) => !abierto);
    if (this.panelAbierto()) this.consultarEstado();
  }

  anterior(): void {
    this.ejecutar(this.spotify.anterior());
  }

  siguiente(): void {
    this.ejecutar(this.spotify.siguiente());
  }

  alternarReproduccion(): void {
    this.ejecutar(this.sonando() ? this.spotify.pausar() : this.spotify.reproducir());
  }

  buscar(): void {
    const texto = this.consulta().trim();
    if (texto.length < 2) {
      this.resultados.set([]);
      this.sinResultados.set(false);
      return;
    }

    const ahora = Date.now();
    if (ahora - this.ultimaBusqueda < this.SEGUNDOS_BUSQUEDA) return;
    this.ultimaBusqueda = ahora;

    const id = ++this.idBusqueda;
    this.buscando.set(true);
    this.sinResultados.set(false);

    this.spotify.buscar(texto, 10)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pistas) => {
          if (id !== this.idBusqueda) return;
          this.resultados.set(pistas);
          this.sinResultados.set(pistas.length === 0);
          this.buscando.set(false);
        },
        error: (fallo) => {
          if (id !== this.idBusqueda) return;
          this.error.set(this.spotify.comoError(fallo));
          this.resultados.set([]);
          this.buscando.set(false);
        }
      });
  }

  elegir(pista: PistaSpotify): void {
    this.ejecutar(this.spotify.reproducirPista(pista.uri), () => {
      this.panelAbierto.set(false);
      this.resultados.set([]);
      this.consulta.set('');
      this.consultarEstado();
    });
  }

  conectar(): void {
    this.spotify.getUrlConexion(window.location.href)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ url }) => {
          sessionStorage.setItem(this.CLAVE_SESION, '1');
          window.location.href = url;
        },
        error: (fallo) => this.error.set(this.spotify.comoError(fallo))
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
          this.panelAbierto.set(false);
        },
        error: (fallo) => this.error.set(this.spotify.comoError(fallo))
      });
  }

  descartarError(): void {
    this.error.set(null);
  }

  private ejecutar(peticion: ReturnType<SpotifyService['pausar']>, despues?: () => void): void {
    if (this.ocupado()) return;
    this.ocupado.set(true);

    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.ocupado.set(false);
        this.error.set(null);
        despues?.();
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

  private aplicarEstado(estado: {
    conectado: boolean;
    sonando: boolean;
    pista: PistaSpotify | null;
  }): void {
    this.conectado.set(estado.conectado || !!estado.pista);
    this.sonando.set(estado.sonando);
    this.pista.set(estado.pista ?? null);
  }

  private escucharRetorno(): void {
    const parametros = new URLSearchParams(window.location.search);
    const codigo = parametros.get('code');
    const veniaDeSpotify = sessionStorage.getItem(this.CLAVE_SESION) === '1';

    if (!codigo || !veniaDeSpotify) return;

    sessionStorage.removeItem(this.CLAVE_SESION);
    this.conectado.set(true);
    this.error.set(null);

    const url = `${environment.apiUrl}/api/spotify/callback?code=${encodeURIComponent(codigo)}`;
    this.http.get<{ estado: string }>(url)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.limpiarUrl();
          this.consultarEstado();
        },
        error: (fallo) => {
          this.error.set(this.spotify.comoError(fallo));
          this.limpiarUrl();
        }
      });
  }

  private limpiarUrl(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    window.history.replaceState({}, '', url.toString());
  }
}
