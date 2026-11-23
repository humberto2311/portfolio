import { Component, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfileService } from '../../../core/services/user-profile.service';

const CLAVE_NOTA = 'nsoft.nota';
const LIMITE_NOTA = 120;

@Component({
  selector: 'app-notas-usuario',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notas-usuario.component.html',
  styleUrl: './notas-usuario.component.scss'
})
export class NotasUsuarioComponent {

  private auth = inject(AuthService);
  private perfiles = inject(UserProfileService);

  readonly compacto = input(false);
  readonly cambiar = output<string | null>();

  readonly nota = signal<string | null>(this.leer());
  readonly editando = signal(false);
  readonly texto = signal('');
  readonly avatarRoto = signal(false);

  readonly avatar = computed(() => this.perfiles.avatar() ?? null);
  readonly iniciales = computed(() => {
    const nombre = this.auth.currentUser()?.fullName ?? 'Yo';

    return nombre.split(' ').filter(Boolean).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
  });

  abrir(): void {
    this.texto.set(this.nota() ?? '');
    this.editando.set(true);
  }

  guardar(evento?: Event): void {
    evento?.preventDefault();

    const limpio = this.texto().trim().slice(0, LIMITE_NOTA);

    this.nota.set(limpio || null);
    this.cambiar.emit(limpio || null);
    this.editando.set(false);

    try {
      if (limpio) {
        localStorage.setItem(CLAVE_NOTA, limpio);
      } else {
        localStorage.removeItem(CLAVE_NOTA);
      }
    } catch {
      return;
    }
  }

  quitar(): void {
    this.texto.set('');
    this.guardar();
  }

  private leer(): string | null {
    try {
      return localStorage.getItem(CLAVE_NOTA);
    } catch {
      return null;
    }
  }
}
