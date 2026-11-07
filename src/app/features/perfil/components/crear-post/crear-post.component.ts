import {
  Component,
  Input,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PerfilService } from '../../../../core/services/perfil.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UserProfileService } from '../../../../core/services/user-profile.service';
import { ToastService } from '../../../../core/services/toast.service';
import { MencionesDirective } from '../../../../shared/directives/menciones.directive';

@Component({
  selector: 'app-crear-post',
  standalone: true,
  imports: [CommonModule, FormsModule, MencionesDirective],
  templateUrl: './crear-post.component.html',
  styleUrls: ['./crear-post.component.scss']
})
export class CrearPostComponent implements OnInit {
  /** true cuando se publica en el muro de otra persona (queda pendiente). */
  @Input() destinoAjeno = false;

  private perfilService = inject(PerfilService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);
  private perfiles = inject(UserProfileService);

  readonly miAvatar = this.perfiles.avatar;

  texto = '';
  imagenPreview = signal<string | null>(null);
  publicando = signal(false);

  ngOnInit(): void {
    this.perfiles.cargarMiAvatar();
  }

  get inicialesUsuario(): string {
    const user = this.authService.currentUser();
    if (!user || !user.fullName) return '?';

    const partes = user.fullName.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();

    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
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
