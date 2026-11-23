import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerfilService } from '../../../core/services/perfil.service';

/**
 * El pensamiento del perfil.
 *
 * Vive en el servidor (`PUT /api/users/me/nota`), no en el navegador: así lo ve
 * cualquiera que entre al perfil. El dueño lo edita dentro de la propia cápsula,
 * sin modal; a los demás solo se les muestra, sin lápiz ni X.
 */
@Component({
  selector: 'app-notas-usuario',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notas-usuario.component.html',
  styleUrl: './notas-usuario.component.scss'
})
export class NotasUsuarioComponent {

  private perfiles = inject(PerfilService);
  private inyector = inject(Injector);

  /** `true` cuando el perfil que se ve es el del usuario conectado. */
  readonly propietario = input(false);
  readonly compacto = input(false);
  readonly cambiar = output<string | null>();

  readonly limite = 120;

  /** El servidor la limpia al guardar; lo que llega aquí ya viene recortado. */
  readonly nota = signal<string | null>(null);
  readonly editando = signal(false);
  readonly texto = signal('');
  readonly guardando = signal(false);

  private readonly campo = viewChild<ElementRef<HTMLInputElement>>('campo');

  constructor() {
    // La nota la carga el perfil; este componente solo la refleja y la guarda.
    // Mientras se está guardando no se pisa lo que el usuario acaba de escribir.
    effect(() => {
      if (this.guardando()) return;

      const valor = this.perfiles.perfil()?.nota ?? null;
      this.nota.set(valor && valor.trim() ? valor : null);
    });
  }

  /** Entra en edición (solo el dueño) y deja el cursor al final. */
  abrir(): void {
    if (!this.propietario() || this.guardando()) return;

    this.texto.set(this.nota() ?? '');
    this.editando.set(true);

    afterNextRender(() => {
      const entrada = this.campo()?.nativeElement;
      if (!entrada) return;

      entrada.focus();
      const fin = entrada.value.length;
      entrada.setSelectionRange(fin, fin);
    }, { injector: this.inyector });
  }

  /**
   * Guarda lo escrito. Un texto vacío borra el pensamiento.
   *
   * Ojo: el input dispara `blur` cuando se pulsa el check, y el check dispara
   * `click`. Sin esta guarda, el `blur` guardaba primero y el `click` encontraba
   * `editando()` ya en false: el segundo guardado mandaba el texto viejo y
   * borraba lo recién escrito. Por eso solo se guarda una vez por edición.
   */
  guardar(evento?: Event): void {
    evento?.preventDefault();

    if (!this.editando() || this.guardando()) return;

    this.editando.set(false);
    this.enviar(this.texto().trim().slice(0, this.limite));
  }

  /** Sale sin guardar. */
  cancelar(): void {
    this.editando.set(false);
    this.texto.set('');
  }

  quitar(): void {
    if (!this.propietario() || this.guardando()) return;

    this.editando.set(false);
    this.enviar('');
  }

  private enviar(valor: string): void {
    const anterior = this.nota();

    this.nota.set(valor || null);
    this.guardando.set(true);

    this.perfiles.guardarNota(valor).subscribe({
      next: (guardada) => {
        this.nota.set(guardada || null);
        this.guardando.set(false);
        this.cambiar.emit(guardada || null);
      },
      error: () => {
        // Si el servidor no la acepta, se vuelve a lo que había.
        this.nota.set(anterior);
        this.guardando.set(false);
      }
    });
  }
}
