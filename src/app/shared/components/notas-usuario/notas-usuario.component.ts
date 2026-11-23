import {
  Component,
  ElementRef,
  Injector,
  OnInit,
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
export class NotasUsuarioComponent implements OnInit {

  private perfiles = inject(PerfilService);
  private inyector = inject(Injector);

  /** `true` cuando el perfil que se ve es el del usuario conectado. */
  readonly propietario = input(false);
  readonly compacto = input(false);
  /** Empieza el componente ya en modo escritura (para el visor del avatar). */
  readonly editarAlAbrir = input(false);
  /** Si el padre ya trae la nota (el carrusel), se usa esta en vez de la del perfil. */
  readonly notaEntrada = input<string | null>(null, { alias: 'nota' });
  /** El padre puede cerrar la edición (por ejemplo con su propia X). */
  readonly cerrarSenal = input(0, { alias: 'cerrar' });
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

      const valor = this.notaEntrada() ?? this.perfiles.perfil()?.nota ?? null;
      this.nota.set(valor && valor.trim() ? valor : null);
    }, { allowSignalWrites: true });

    // Un cambio en esta señal (la X del padre) sale del modo edición.
    let ultimo = this.cerrarSenal();

    effect(() => {
      const ahora = this.cerrarSenal();

      if (ahora === ultimo) return;

      ultimo = ahora;
      this.cancelar();
    });
  }

  ngOnInit(): void {
    if (this.editarAlAbrir() && this.propietario()) {
      this.abrir();
    }
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
        // Si el servidor contesta sin texto, vale lo que escribió el usuario:
        // así la burbuja del carrusel no se queda vacía.
        const final = guardada?.trim() || valor.trim() || null;

        this.nota.set(final);
        this.guardando.set(false);
        this.cambiar.emit(final);
      },
      error: (err) => {
        // Se avisa igual: el carrusel pinta lo escrito aunque el servidor falle.
        console.warn('No se pudo guardar la nota', err);
        this.nota.set(anterior);
        this.guardando.set(false);
        this.cambiar.emit(valor.trim() || null);
      }
    });
  }
}
