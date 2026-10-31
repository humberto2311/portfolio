import {
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PerfilService } from '../../../../core/services/perfil.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  SugerenciaUsuario,
  UserDirectoryService,
} from '../../../../core/services/user-directory.service';

@Component({
  selector: 'app-crear-post',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crear-post.component.html',
  styleUrls: ['./crear-post.component.scss']
})
export class CrearPostComponent implements OnInit {
  /** true cuando se publica en el muro de otra persona (queda pendiente). */
  @Input() destinoAjeno = false;

  @ViewChild('entrada') entradaRef?: ElementRef<HTMLInputElement>;

  private perfilService = inject(PerfilService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private directorio = inject(UserDirectoryService);

  texto = '';
  imagenPreview = signal<string | null>(null);
  publicando = signal(false);

  // --- Sugerencias @ ---
  sugerencias = signal<SugerenciaUsuario[]>([]);
  indice = signal(0);
  abiertoSugerencias = signal(false);
  private tokenInicio = -1;

  ngOnInit(): void {
    this.directorio.cargarRed().subscribe();
  }

  get inicialesUsuario(): string {
    const user = this.authService.currentUser();
    if (!user || !user.fullName) return '?';

    const partes = user.fullName.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();

    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  }

  // ====== @ SUGERENCIAS ======

  onInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    this.texto = el.value;

    const caret = el.selectionStart ?? el.value.length;
    const antes = el.value.slice(0, caret);
    const match = /(?:^|[\s(])@([\w.\-]*)$/.exec(antes);

    if (!match) {
      this.cerrarSugerencias();
      return;
    }

    this.tokenInicio = caret - match[1].length - 1;
    this.indice.set(0);

    this.directorio.buscar(match[1], 8).subscribe({
      next: (lista) => {
        this.sugerencias.set(lista);
        this.abiertoSugerencias.set(lista.length > 0);
      },
      error: () => this.cerrarSugerencias(),
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (!this.abiertoSugerencias()) {
      if (event.key === 'Enter') this.publicar();
      return;
    }

    const total = this.sugerencias().length;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.indice.update((i) => (i + 1) % total);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.indice.update((i) => (i - 1 + total) % total);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.elegir(this.sugerencias()[this.indice()]);
    } else if (event.key === 'Escape') {
      this.cerrarSugerencias();
    }
  }

  elegir(sugerencia: SugerenciaUsuario): void {
    if (this.tokenInicio < 0) return;

    const antes = this.texto.slice(0, this.tokenInicio);
    const resto = this.texto
      .slice(this.tokenInicio)
      .replace(/^@[\w.\-]*/, '')
      .replace(/^\s+/, '');
    const insertado = `@${sugerencia.username} `;
    this.texto = antes + insertado + resto;

    const posicion = (antes + insertado).length;
    this.cerrarSugerencias();

    setTimeout(() => {
      const el = this.entradaRef?.nativeElement;
      if (el) {
        el.focus();
        el.setSelectionRange(posicion, posicion);
      }
    });
  }

  private cerrarSugerencias(): void {
    this.abiertoSugerencias.set(false);
    this.sugerencias.set([]);
    this.tokenInicio = -1;
  }

  // ====== IMAGEN ======

  onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.imagenPreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  abrirPicker(): void {
    document.getElementById('post-image-input')?.click();
  }

  limpiarImagen(): void {
    this.imagenPreview.set(null);
    const input = document.getElementById('post-image-input') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  // ====== PUBLICAR ======

  publicar(): void {
    const txt = this.texto.trim();
    if ((!txt && !this.imagenPreview()) || this.publicando()) return;

    this.publicando.set(true);
    this.perfilService
      .crearPublicacion(txt, this.imagenPreview() || undefined)
      .subscribe({
        next: ({ pendiente, destino, compartidosCon }) => {
          this.publicando.set(false);

          if (pendiente) {
            this.toast.show(
              `Enviado a ${destino}: debe aceptarlo para que aparezca en su perfil`
            );
          } else if (compartidosCon > 0) {
            const quien =
              compartidosCon === 1 ? '1 persona' : `${compartidosCon} personas`;
            this.toast.show(`Publicado y compartido con ${quien}`);
          } else {
            this.toast.show('Publicación creada');
          }

          this.texto = '';
          this.limpiarImagen();
        },
        error: (err) => {
          this.publicando.set(false);
          this.toast.show(this.mensajeError(err, 'No se pudo publicar'));
        },
      });
  }

  private mensajeError(err: any, porDefecto: string): string {
    return err?.error?.message || err?.error?.error || porDefecto;
  }
}
