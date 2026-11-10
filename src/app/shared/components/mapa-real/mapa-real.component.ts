import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  Input,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  signal,
} from '@angular/core';

type Leaflet = typeof import('leaflet');

export interface MapaLatLng {
  lat: number;
  lng: number;
  zoom?: number;
}

@Component({
  selector: 'app-mapa-real',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mapa-real.component.html',
  styleUrls: ['./mapa-real.component.scss'],
})
export class MapaRealComponent implements AfterViewInit, OnDestroy {
  @Input() lat = 4.5709;
  @Input() lng = -74.2973;
  @Input() zoom = 4;
  @Input() minZoom = 1;
  @Input() maxZoom = 19;
  @Input() altura = '420px';
  @Input() compacto = false;

  @ViewChild('contenedor') contenedor?: ElementRef<HTMLDivElement>;

  readonly listo = signal(false);
  readonly zoomActual = signal(4);

  private L: Leaflet | null = null;
  private mapa: import('leaflet').Map | null = null;
  private capa: import('leaflet').TileLayer | null = null;
  private marcador: import('leaflet').Marker | null = null;
  private marcadores: import('leaflet').Marker[] = [];

  constructor(@Inject(PLATFORM_ID) private plataforma: object) {}

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.plataforma)) return;
    if (!this.contenedor?.nativeElement) return;

    this.L = await import('leaflet');
    const L = this.L;

    this.mapa = L.map(this.contenedor.nativeElement, {
      center: [this.lat, this.lng],
      zoom: this.zoom,
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
      zoomControl: !this.compacto,
      attributionControl: true,
      scrollWheelZoom: !this.compacto,
      doubleClickZoom: !this.compacto,
      dragging: !this.compacto,
      worldCopyJump: true,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 90,
    });

    this.capa = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 1,
      noWrap: false,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.mapa);

    this.mapa.on('zoomend', () => this.zoomActual.set(this.mapa?.getZoom() ?? this.zoom));

    setTimeout(() => {
      this.mapa?.invalidateSize();
      this.zoomActual.set(this.mapa?.getZoom() ?? this.zoom);
    }, 120);

    this.listo.set(true);
  }

  ngOnDestroy(): void {
    this.mapa?.remove();
    this.mapa = null;
    this.capa = null;
    this.marcador = null;
  }

  get mapaActivo(): import('leaflet').Map | null {
    return this.mapa;
  }

  acercar(): void {
    this.mapa?.zoomIn(1);
  }

  alejar(): void {
    this.mapa?.zoomOut(1);
  }

  verTodoElMundo(): void {
    this.mapa?.setView([20, 0], 2, { animate: true });
  }

  centrarPais(): void {
    this.mapa?.flyTo([this.lat, this.lng], this.zoom, { duration: 1 });
    if (this.marcador && this.mapa) {
      this.mapa.removeLayer(this.marcador);
      this.marcador = null;
    }
  }

  irA(lat: number, lng: number, zoom = 12): void {
    this.mapa?.flyTo([lat, lng], zoom, { duration: 1.1 });
    this.marcar(lat, lng);
  }

  marcar(lat: number, lng: number, texto?: string, tono: 'personal' | 'empresarial' | 'local' | 'empleo' = 'empleo'): void {
    if (!this.mapa) return;

    const icono = this.icono(tono);

    if (!this.marcador) {
      this.marcador = this.L!.marker([lat, lng], icono ? { icon: icono } : {});
      this.marcador.addTo(this.mapa);
    } else {
      this.marcador.setLatLng([lat, lng]);
      if (icono) {
        this.marcador.setIcon(icono);
      }
    }

    if (texto) {
      this.marcador.bindTooltip(texto, {
        direction: 'top',
        offset: [0, -12],
        opacity: 1,
        className: 'tooltip-mapa',
        permanent: false,
        sticky: false,
      });
      this.marcador.openTooltip();
    }
  }

  marcarVarios(
    puntos: { lat: number; lng: number; texto: string; tono?: 'personal' | 'empresarial' | 'local' | 'empleo' }[],
  ): void {
    if (!this.mapa || !this.L) return;

    this.limpiarMarcadores();

    for (const punto of puntos) {
      const icono = this.icono(punto.tono ?? 'empleo');

      const marcador = this.L.marker([punto.lat, punto.lng], icono ? { icon: icono } : {})
        .addTo(this.mapa);

      marcador.bindTooltip(punto.texto, {
        direction: 'top',
        offset: [0, -12],
        opacity: 1,
        className: 'tooltip-mapa',
      });

      this.marcadores.push(marcador);
    }
  }

  limpiarMarcadores(): void {
    if (!this.mapa) return;

    this.marcadores.forEach((marcador) => this.mapa?.removeLayer(marcador));
    this.marcadores = [];

    if (this.marcador) {
      this.mapa.removeLayer(this.marcador);
      this.marcador = null;
    }
  }

  ajustar(puntos: { lat: number; lng: number }[]): void {
    if (!this.mapa || !this.L || !puntos.length) return;

    if (puntos.length === 1) {
      this.mapa.setView([puntos[0].lat, puntos[0].lng], 15, { animate: true });
      return;
    }

    const limites = this.L.latLngBounds(puntos.map((punto) => [punto.lat, punto.lng] as [number, number]));
    this.mapa.fitBounds(limites, { padding: [40, 40], maxZoom: 14 });
  }

  private icono(tono: 'personal' | 'empresarial' | 'local' | 'empleo' = 'empleo'): import('leaflet').DivIcon | null {
    if (!this.L) return null;

    const iconos: Record<string, string> = {
      personal: 'fa-user',
      empresarial: 'fa-building',
      local: 'fa-store',
      empleo: 'fa-briefcase',
    };

    return this.L.divIcon({
      className: `pin-mapa pin-mapa--${tono}`,
      html: `<span class="pin-mapa__punto"><i class="fa-solid ${iconos[tono]}"></i></span>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
  }
}
