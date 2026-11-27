import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EstadosService, STICKERS_ESTADO } from '../../core/services/estados.service';
import { PistaMusica } from '../../core/models/estado.model';
import { firstValueFrom } from 'rxjs';
import { PerfilService } from '../../core/services/perfil.service';
import { UserProfileService } from '../../core/services/user-profile.service';
import { AuthService } from '../../core/services/auth.service';
import { AudienciaModalComponent } from '../../shared/components/audiencia-modal/audiencia-modal.component';
import { VisibilidadContenido, VISIBILIDADES } from '../../core/models/privacidad.model';

@Component({
  selector: 'app-estados-creador',
  standalone: true,
  imports: [CommonModule, FormsModule, AudienciaModalComponent],
  templateUrl: './estados-creador.component.html',
  styleUrls: ['./estados-creador.component.scss']
})
export class EstadosCreadorComponent implements OnInit {

  private estados = inject(EstadosService);
  private perfiles = inject(UserProfileService);
  private perfilSvc = inject(PerfilService);
  private auth = inject(AuthService);

  readonly avatarRoto = signal(false);
  readonly visibilidad = signal<VisibilidadContenido>('PUBLICO');
  readonly permitidos = signal<string[]>([]);
  readonly excluidos = signal<string[]>([]);
  readonly modalAudiencia = signal(false);

  readonly etiquetaVisibilidad = computed(() => {
    const encontrada = VISIBILIDADES.find((opcion) => opcion.valor === this.visibilidad());

    return encontrada ? encontrada.etiqueta : 'Público';
  });

  readonly avatarPropio = computed(() =>
    this.perfiles.avatar() ?? this.perfilSvc.miPerfil()?.avatarUrl ?? null);

  readonly iniciales = computed(() => {
    const nombre = this.auth.currentUser()?.fullName ?? 'Yo';

    return nombre.split(' ').filter(Boolean).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
  });

  readonly cerrar = output<void>();
  readonly publicado = output<void>();

  readonly stickers = STICKERS_ESTADO;

  readonly audio = signal<string | null>(null);
  readonly video = signal<string | null>(null);
  readonly imagen = signal<string | null>(null);
  readonly texto = signal('');
  readonly stickersPuestos = signal<string[]>([]);
  readonly musica = signal<PistaMusica | null>(null);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  readonly buscadorMusica = signal(false);
  readonly consultaMusica = signal('');
  readonly resultados = signal<PistaMusica[]>([]);

  readonly tipoMedia = computed<'AUDIO' | 'VIDEO' | 'FOTO' | 'TEXTO'>(() => {
    if (this.audio()) return 'AUDIO';
    if (this.video()) return 'VIDEO';
    if (this.imagen()) return 'FOTO';

    return 'TEXTO';
  });

  readonly puedePublicar = computed(() =>
    !!this.audio() || !!this.video() || !!this.imagen() || this.texto().trim().length > 0);

  ngOnInit(): void {
    this.buscar('');
    this.perfiles.cargarMiAvatar();
  }

  async elegirArchivo(evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];

    if (!archivo) return;

    try {
      const datos = await firstValueFrom(this.estados.subirArchivo(archivo));

      if (archivo.type.startsWith('audio/')) {
        this.audio.set(datos);
        this.video.set(null);
        this.imagen.set(null);
      } else if (archivo.type.startsWith('video/')) {
        this.video.set(datos);
        this.audio.set(null);
        this.imagen.set(null);
      } else {
        this.imagen.set(datos);
        this.video.set(null);
      }

      this.error.set(null);
    } catch {
      this.error.set('No se pudo leer el archivo.');
    }

    entrada.value = '';
  }

  quitarMedia(): void {
    this.video.set(null);
    this.imagen.set(null);
    this.audio.set(null);
  }

  anadirSticker(sticker: string): void {
    if (this.stickersPuestos().length >= 8) {
      this.error.set('Máximo 8 stickers.');
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

  abrirAudiencia(): void {
    this.modalAudiencia.set(true);
  }

  aplicarAudiencia(eleccion: { visibilidad: VisibilidadContenido; permitidos: string[]; excluidos: string[] }): void {
    this.visibilidad.set(eleccion.visibilidad);
    this.permitidos.set(eleccion.permitidos);
    this.excluidos.set(eleccion.excluidos);
    this.modalAudiencia.set(false);
  }

  publicar(): void {
    if (!this.puedePublicar() || this.guardando()) return;

    this.guardando.set(true);
    this.error.set(null);

    this.estados.publicarBorrador({
      texto: this.texto().trim(),
      imagen: this.imagen(),
      video: this.video(),
      audio: this.audio(),
      stickers: this.stickersPuestos(),
      musica: this.musica(),
      visibilidad: this.visibilidad(),
      permitidos: this.permitidos(),
      excluidos: this.excluidos()
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.publicado.emit();
      },
      error: () => {
        this.guardando.set(false);
        this.error.set('No se pudo publicar. Intenta de nuevo.');
      }
    });
  }
}
