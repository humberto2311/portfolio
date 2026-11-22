import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EstadosService, FONDOS_ESTADO, STICKERS_ESTADO } from '../../core/services/estados.service';
import { CrearEstado, PistaMusica, TipoEstado } from '../../core/models/estado.model';

@Component({
  selector: 'app-estados-creador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './estados-creador.component.html',
  styleUrls: ['./estados-creador.component.scss']
})
export class EstadosCreadorComponent implements OnInit {

  private estados = inject(EstadosService);

  readonly cerrar = output<void>();
  readonly publicado = output<void>();

  readonly fondos = FONDOS_ESTADO;
  readonly stickers = STICKERS_ESTADO;

  readonly tipo = signal<TipoEstado>('TEXTO');
  readonly fondo = signal(FONDOS_ESTADO[2]);
  readonly texto = signal('');
  readonly imagen = signal<string | null>(null);
  readonly stickersPuestos = signal<string[]>([]);
  readonly musica = signal<PistaMusica | null>(null);
  readonly duracion = signal(10);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  readonly buscadorMusica = signal(false);
  readonly consultaMusica = signal('');
  readonly resultados = signal<PistaMusica[]>([]);

  readonly puedePublicar = computed(() =>
    this.tipo() === 'FOTO' ? !!this.imagen() : this.texto().trim().length > 0);

  ngOnInit(): void {
    this.buscar('');
  }

  elegirTipo(tipo: TipoEstado): void {
    this.tipo.set(tipo);
  }

  elegirFondo(color: string): void {
    this.fondo.set(color);
    this.tipo.set('TEXTO');
  }

  async elegirImagen(evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];

    if (!archivo) return;

    try {
      const datos = await this.estados.leerComoDataUrl(archivo);

      this.imagen.set(datos);
      this.tipo.set('FOTO');
      this.error.set(null);
    } catch {
      this.error.set('No se pudo leer la imagen.');
    }
  }

  quitarImagen(): void {
    this.imagen.set(null);
    this.tipo.set('TEXTO');
  }

  anadirSticker(sticker: string): void {
    if (this.stickersPuestos().length >= 8) {
      this.error.set('Máximo 8 stickers por estado.');
      return;
    }

    this.stickersPuestos.set([...this.stickersPuestos(), sticker]);
  }

  quitarSticker(indice: number): void {
    this.stickersPuestos.set(this.stickersPuestos().filter((_, i) => i !== indice));
  }

  buscar(texto: string): void {
    this.consultaMusica.set(texto);
    this.estados.buscarMusica(texto).subscribe((pistas) => this.resultados.set(pistas));
  }

  elegirMusica(pista: PistaMusica): void {
    this.musica.set(pista);
    this.buscadorMusica.set(false);
  }

  quitarMusica(): void {
    this.musica.set(null);
  }

  publicar(): void {
    if (!this.puedePublicar()) return;

    this.guardando.set(true);
    this.error.set(null);

    const pista = this.musica();

    const cuerpo: CrearEstado = {
      tipo: this.tipo(),
      contenidoUrl: this.tipo() === 'FOTO' ? this.imagen() : null,
      texto: this.texto().trim() || null,
      fondo: this.fondo(),
      musicaId: pista?.id ?? null,
      musicaTitulo: pista?.titulo ?? null,
      musicaArtista: pista?.artista ?? null,
      musicaUrl: pista?.url || null,
      musicaInicio: 0,
      stickers: this.stickersPuestos(),
      duracionSegundos: this.duracion()
    };

    this.estados.publicar(cuerpo).subscribe({
      next: () => {
        this.guardando.set(false);
        this.publicado.emit();
      },
      error: (err) => {
        this.guardando.set(false);
        this.error.set(err?.error?.error ?? 'No se pudo publicar el estado.');
      }
    });
  }
}
