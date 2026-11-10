import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';

import { FotoLugar, MapaService } from '../../../core/services/mapa.service';

@Component({
  selector: 'app-mapillary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mapillary.component.html',
  styleUrls: ['./mapillary.component.scss'],
})
export class MapillaryComponent implements OnInit, OnChanges, OnDestroy {
  @Input() lat = 4.6097;
  @Input() lng = -74.0817;
  @Input() radio = 150;
  @Input() titulo = 'Imágenes del lugar';
  @Input() altura = '110px';
  @Input() compacto = false;

  private servicio = inject(MapaService);

  readonly fotos = signal<FotoLugar[]>([]);
  readonly cargando = signal(false);
  readonly configurado = signal(true);
  readonly activa = signal<FotoLugar | null>(null);

  private peticion = 0;

  ngOnInit(): void {
    this.cargar();
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['lat'] || cambios['lng']) {
      this.cargar();
    }
  }

  ngOnDestroy(): void {
    this.activa.set(null);
  }

  ampliar(): void {
    this.cargarCon(Math.max(1000, this.radio));
  }

  cargar(): void {
    this.cargarCon(this.radio);
  }

  private cargarCon(radio: number): void {
    this.cargando.set(true);
    const marca = ++this.peticion;

    this.servicio.fotos(this.lat, this.lng, radio).subscribe((respuesta) => {
      if (marca !== this.peticion) return;

      this.cargando.set(false);
      this.configurado.set(respuesta.configurado);
      this.fotos.set(respuesta.fotos ?? []);
    });
  }

  ver(foto: FotoLugar): void {
    this.activa.set(foto);
  }

  cerrar(): void {
    this.activa.set(null);
  }
}
