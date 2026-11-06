import { Component, HostListener, Input, OnChanges, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerfilService } from '../../../../core/services/perfil.service';
import { Publicacion } from '../../../../core/models/perfil.model';
import { FotoPerfil, UserPhotoService } from '../../../../core/services/user-photo.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ArchivoService } from '../../../../core/services/archivo.service';
import { PostCardComponent } from '../post-card/post-card.component';
import { PhotoViewerComponent } from '../photo-viewer/photo-viewer.component';

@Component({
  selector: 'app-tab-fotos',
  standalone: true,
  imports: [CommonModule, PostCardComponent, PhotoViewerComponent],
  templateUrl: './tab-fotos.component.html',
  styleUrls: ['./tab-fotos.component.scss']
})
export class TabFotosComponent implements OnChanges {
  @Input({ required: true }) userId!: string;
  @Input() esMiPerfil = false;

  private fotosSvc = inject(UserPhotoService);
  private perfilService = inject(PerfilService);
  private toast = inject(ToastService);
  private archivos = inject(ArchivoService);

  fotos = signal<FotoPerfil[]>([]);
  menuAbierto = signal<number | null>(null);
  ampliada = signal<FotoPerfil | null>(null);
  cargando = signal(true);
  subiendo = signal(false);

  publicaciones = this.perfilService.publicaciones;

  /** Todo lo que se publica con imagen vive aquí, con sus likes y comentarios. */
  postsConMedia = computed<Publicacion[]>(() =>
    this.publicaciones().filter(p => !!p.imagen)
  );

  ngOnChanges(): void {
    this.cargar();
  }

  private cargar(): void {
    if (!this.userId) return;

    this.cargando.set(true);
    this.fotosSvc.listar(this.userId).subscribe({
      next: (lista) => {
        // La portada y el avatar ya los muestra el header; aquí se ven igual, son parte de la galería.
        this.fotos.set(lista ?? []);
        this.cargando.set(false);
      },
      error: () => {
        this.fotos.set([]);
        this.cargando.set(false);
      }
    });

    this.perfilService.cargarPublicaciones(this.userId);
  }

  toggleMenu(foto: FotoPerfil, event: Event): void {
    event.stopPropagation();
    this.menuAbierto.update(id => (id === foto.id ? null : foto.id));
  }

  ampliar(foto: FotoPerfil): void {
    this.ampliada.set(foto);
    this.menuAbierto.set(null);
  }

  cerrar(): void {
    this.ampliada.set(null);
  }

  eliminar(foto: FotoPerfil): void {
    this.menuAbierto.set(null);
    this.alEliminar(foto.id);
    this.toast.show('Foto eliminada');
  }

  /** El visor grande ya borró la foto en el backend: aquí solo se quita de la rejilla. */
  alEliminar(photoId: number): void {
    this.fotos.update(list => list.filter(f => f.id !== photoId));
    this.cerrar();
  }

  alCambiarDescripcion(foto: FotoPerfil): void {
    this.fotos.update(list =>
      list.map(f => (f.id === foto.id ? { ...f, descripcion: foto.descripcion } : f))
    );
    this.ampliada.update(actual =>
      actual?.id === foto.id ? { ...actual, descripcion: foto.descripcion } : actual
    );
  }

  descargar(foto: FotoPerfil): void {
    this.archivos.guardar(this.aBlob(foto.url), 'foto-perfil', 'Foto del perfil').then((resultado) => {
      if (resultado === 'cancelado') return;
      this.toast.show(resultado === 'compartido' ? 'Foto compartida' : 'Foto descargada');
    });
  }

  /** La galería sube como publicación: así hereda like, comentarios y compartir. */
  elegirArchivo(): void {
    if (!this.esMiPerfil || this.subiendo()) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const archivo = input.files?.[0];
      if (archivo) this.publicar(archivo);
    };
    input.click();
  }

  private publicar(archivo: File): void {
    this.subiendo.set(true);

    const lector = new FileReader();
    lector.onload = () => {
      this.perfilService.crearPublicacion('', String(lector.result)).subscribe({
        next: () => {
          this.subiendo.set(false);
          this.toast.show('Foto publicada en tu galería');
        },
        error: () => {
          this.subiendo.set(false);
          this.toast.show('No se pudo publicar la foto');
        }
      });
    };
    lector.onerror = () => {
      this.subiendo.set(false);
      this.toast.show('No se pudo leer el archivo');
    };
    lector.readAsDataURL(archivo);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cerrar();
  }

  /** Las fotos se guardan como data URL; para compartirlas hace falta el binario. */
  private aBlob(dataUrl: string): Blob {
    const [meta, datos] = dataUrl.split(',');
    if (!datos) return new Blob([], { type: 'image/jpeg' });

    const mime = /:(.*?);/.exec(meta)?.[1] ?? 'image/jpeg';
    const binario = atob(datos);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
}
