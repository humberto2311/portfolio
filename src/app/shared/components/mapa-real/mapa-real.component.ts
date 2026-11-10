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

  marcar(lat: number, lng: number, texto?: string): void {
    if (!this.mapa) return;

    const icono = this.icono();

    if (!this.marcador) {
      this.marcador = this.L!.marker([lat, lng], icono ? { icon: icono } : {});
      this.marcador.addTo(this.mapa);
    } else {
      this.marcador.setLatLng([lat, lng]);
    }

    if (texto) {
      this.marcador.bindPopup(texto);
    }
  }

  private icono(): import('leaflet').DivIcon | null {
    if (!this.L) return null;
    return this.L.divIcon({
      className: 'pin-mapa',
      html: '<span class="pin-mapa__punto"></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }
}
