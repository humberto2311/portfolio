import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AuthService, EstadoCuenta } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { TemaService } from '../../core/services/tema.service';
import { Diseno, DisenoService } from '../../core/services/diseno.service';
import { UserPhotoService, FotoPerfil } from '../../core/services/user-photo.service';
import { ResumeService } from '../../core/services/resume.service';
import { ResumeSaveService } from '../../core/services/resume-save.service';
import { ResumeProfile } from '../../core/models/resume.model';

@Component({
  selector: 'app-ajustes-cuenta',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ajustes-cuenta.component.html',
  styleUrls: ['./ajustes-cuenta.component.scss']
})
export class AjustesCuentaComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private resume = inject(ResumeService);
  private resumeSave = inject(ResumeSaveService);
  readonly tema = inject(TemaService);
  readonly diseno = inject(DisenoService);
  private fotos = inject(UserPhotoService);


  readonly generos = [
    { valor: 'masculino', texto: 'Masculino' },
    { valor: 'femenino', texto: 'Femenino' },
    { valor: 'otro', texto: 'Otro' },
    { valor: 'prefiero_no_decir', texto: 'Prefiero no decir' }
  ];

  isLoading = true;
  errorMessage: string | null = null;

  // Datos personales
  nombre = '';
  telefono = '';
  genero = '';
  nacimiento = '';
  email = '';
  guardandoDatos = false;

  // Contraseña
  claveActual = '';
  claveNueva = '';
  claveConfirmar = '';
  guardandoClave = false;
  errorClave: string | null = null;
  tieneContrasena = true;

  // Hoja de vida
  cv: ResumeProfile | null = null;
  alternandoCv = false;

  readonly maxDate = new Date().toISOString().split('T')[0];

  readonly paleta = ['#4a9eff', '#3fb950', '#f5b75e', '#e5484d', '#c297ff', '#ff7ac6', '#2dd4bf', '#e8e8e8'];

  acento = '#4a9eff';
  secundario = '';
  fondoUrl: string | null = null;
  css = '';
  acentoTarjeta = '';
  secundarioTarjeta = '';
  cssTarjeta = '';

  galeria = signal<FotoPerfil[]>([]);
  erroresDiseno: string[] = [];
  guardandoDiseno = false;

  private borradorTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.cargarEstado();
    this.cargarCv();
    this.cargarDiseno();
  }

  private cargarEstado() {
    this.isLoading = true;
    this.auth.estado().pipe(finalize(() => (this.isLoading = false))).subscribe({
      next: (estado: EstadoCuenta) => {
        this.email = estado.email;
        this.nombre = estado.nombre ?? '';
        this.telefono = estado.telefono ?? '';
        this.genero = estado.genero ?? '';
        this.nacimiento = estado.nacimiento ?? '';
        this.tieneContrasena = estado.tieneContrasena;
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar tus datos. Vuelve a iniciar sesión.';
      }
    });
  }

  private cargarCv() {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;

    this.resume.getProfileByUserId(userId).subscribe({
      next: (profile) => (this.cv = profile),
      // 404 simplemente significa que todavía no hay hoja de vida creada.
      error: () => (this.cv = null)
    });
  }

  guardarDatos() {
    if (this.nombre.trim().length < 2) {
      this.toast.show('Escribe tu nombre');
      return;
    }

    this.guardandoDatos = true;
    this.auth.actualizarPerfil({
      fullName: this.nombre.trim(),
      phone: this.telefono.trim(),
      gender: this.genero,
      birthDate: this.nacimiento || undefined
    }).pipe(finalize(() => (this.guardandoDatos = false)))
      .subscribe({
        next: (datos) => {
          this.auth.sincronizarUsuario({
            fullName: datos.fullName,
            phone: datos.phone ?? undefined,
            gender: datos.gender ?? undefined,
            birthDate: datos.birthDate ?? undefined
          });
          this.nombre = datos.fullName;
          this.telefono = datos.phone ?? '';
          this.genero = datos.gender ?? '';
          this.nacimiento = datos.birthDate ?? '';
          this.toast.show('Datos actualizados');
        },
        error: () => this.toast.show('No se pudieron guardar los datos')
      });
  }

  guardarClave() {
    this.errorClave = null;

    if (this.claveNueva.length < 8) {
      this.errorClave = 'La contraseña nueva necesita al menos 8 caracteres.';
      return;
    }
    if (this.claveNueva !== this.claveConfirmar) {
      this.errorClave = 'Las contraseñas no coinciden.';
      return;
    }

    this.guardandoClave = true;
    this.auth.cambiarContrasena(this.claveActual, this.claveNueva, this.claveConfirmar)
      .pipe(finalize(() => (this.guardandoClave = false)))
      .subscribe({
        next: () => {
          this.claveActual = this.claveNueva = this.claveConfirmar = '';
          this.tieneContrasena = true;
          this.toast.show('Contraseña actualizada');
        },
        error: (err) => {
          this.errorClave = err.error?.message ?? 'No se pudo cambiar la contraseña';
        }
      });
  }

  alternarVisibilidadCv() {
    if (!this.cv?.id) return;

    const publicar = this.cv.isPublic !== true;
    this.alternandoCv = true;

    const accion$ = publicar
      ? this.resumeSave.publishProfile(this.cv.id)
      : this.resumeSave.unpublishProfile(this.cv.id);

    accion$.pipe(finalize(() => (this.alternandoCv = false)))
      .subscribe({
        next: (profile) => {
          this.cv = profile;
          this.toast.show(publicar ? 'Tu hoja de vida es pública' : 'Tu hoja de vida es privada');
        },
        error: () => this.toast.show('No se pudo cambiar la visibilidad')
      });
  }

  get cvVisible(): boolean {
    return this.cv?.isPublic === true;
  }

  ponerTema(claro: boolean): void {
    if (this.tema.claro() === claro) return;
    this.tema.guardar(claro);
  }

  private cargarDiseno(): void {
    this.diseno.cargarPropio().subscribe((d) => {
      this.acento = d.acento ?? '#4a9eff';
      this.secundario = d.secundario ?? '';
      this.fondoUrl = d.fondoUrl ?? null;
      this.css = d.css ?? '';
      this.acentoTarjeta = d.acentoTarjeta ?? '';
      this.secundarioTarjeta = d.secundarioTarjeta ?? '';
      this.cssTarjeta = d.cssTarjeta ?? '';

      const userId = this.auth.currentUser()?.id;
      if (userId) {
        this.fotos.listar(userId).subscribe({
          next: (listado) => (this.galeria.set(listado)),
          error: () => this.galeria.set([])
        });
      }
    });
  }

  get puedeGuardarDiseno(): boolean {
    return this.esHex(this.acento)
      && (!this.secundario || this.esHex(this.secundario))
      && (!this.acentoTarjeta || this.esHex(this.acentoTarjeta))
      && (!this.secundarioTarjeta || this.esHex(this.secundarioTarjeta));
  }

  private esHex(valor: string): boolean {
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(valor.trim());
  }

  cambiarAcento(valor: string): void {
    this.acento = valor;
    this.previsualizar();
  }

  cambiarSecundario(valor: string): void {
    this.secundario = valor;
    this.previsualizar();
  }

  cambiarCss(valor: string): void {
    this.css = valor;
    this.previsualizar();
  }

  cambiarAcentoTarjeta(valor: string): void {
    this.acentoTarjeta = valor;
    this.previsualizar();
  }

  cambiarSecundarioTarjeta(valor: string): void {
    this.secundarioTarjeta = valor;
    this.previsualizar();
  }

  cambiarCssTarjeta(valor: string): void {
    this.cssTarjeta = valor;
    this.previsualizar();
  }

  inicialesPrevias(): string {
    const partes = this.nombre.trim().split(/\s+/).filter(Boolean);

    if (!partes.length) return '??';

    return partes.length === 1
      ? partes[0].substring(0, 2).toUpperCase()
      : (partes[0][0] + partes[1][0]).toUpperCase();
  }

  elegirFondo(url: string | null): void {
    this.fondoUrl = url;
    this.previsualizar();
  }

  fondoDesdeArchivo(input: HTMLInputElement): void {
    const archivo = input.files?.[0];
    input.value = '';

    if (!archivo) return;

    if (!/^image\/(png|jpe?g|webp)$/i.test(archivo.type)) {
      this.erroresDiseno = ['El fondo debe ser PNG, JPG o WEBP.'];
      return;
    }
    if (archivo.size > 1_500_000) {
      this.erroresDiseno = ['La imagen pesa demasiado: usa una de hasta 1,5 MB.'];
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      this.erroresDiseno = [];
      this.elegirFondo(String(lector.result));
    };
    lector.onerror = () => (this.erroresDiseno = ['No se pudo leer la imagen.']);
    lector.readAsDataURL(archivo);
  }

  private coleccion(): Diseno {
    return {
      acento: this.esHex(this.acento) ? this.acento.trim() : null,
      secundario: this.esHex(this.secundario) ? this.secundario.trim() : null,
      fondoUrl: this.fondoUrl,
      css: this.css.trim() || null,
      activo: true,
      acentoTarjeta: this.esHex(this.acentoTarjeta) ? this.acentoTarjeta.trim() : null,
      secundarioTarjeta: this.esHex(this.secundarioTarjeta) ? this.secundarioTarjeta.trim() : null,
      cssTarjeta: this.cssTarjeta.trim() || null,
      tarjetaActivo: Boolean(this.acentoTarjeta || this.secundarioTarjeta || this.cssTarjeta),
    };
  }

  private previsualizar(): void {
    if (this.borradorTimer) clearTimeout(this.borradorTimer);

    this.borradorTimer = setTimeout(() => {
      const borrador = this.coleccion();
      this.diseno.aplicarAjeno(borrador);
      this.diseno.aplicarPrevia(this.diseno.estaTarjeta(borrador));
    }, 350);
  }

  guardarDiseno(mensaje = 'Tu diseño ya está guardado'): void {
    if (!this.puedeGuardarDiseno) {
      this.erroresDiseno = ['Cada color debe escribirse como #rgb o #rrggbb.'];
      return;
    }

    this.erroresDiseno = [];
    this.guardandoDiseno = true;

    const { acento, secundario, fondoUrl, css, acentoTarjeta, secundarioTarjeta, cssTarjeta } = this.coleccion();

    this.diseno
      .guardar({ acento, secundario, fondoUrl, css, acentoTarjeta, secundarioTarjeta, cssTarjeta })
      .pipe(finalize(() => (this.guardandoDiseno = false)))
      .subscribe({
        next: () => this.toast.show(mensaje),
        error: (err) => {
          this.erroresDiseno = err?.error?.errores?.length
            ? err.error.errores
            : ['No se pudo guardar el diseño.'];
        }
      });
  }

  ngOnDestroy(): void {
    if (this.borradorTimer) clearTimeout(this.borradorTimer);
    this.diseno.limpiarAjeno();
    this.diseno.limpiarPrevia();
  }

  quitarDiseno(): void {
    this.guardandoDiseno = true;

    this.diseno.quitar().pipe(finalize(() => (this.guardandoDiseno = false))).subscribe({
      next: () => {
        this.acento = '#4a9eff';
        this.secundario = '';
        this.fondoUrl = null;
        this.css = '';
        this.acentoTarjeta = '';
        this.secundarioTarjeta = '';
        this.cssTarjeta = '';
        this.erroresDiseno = [];
        this.diseno.limpiarAjeno();
        this.diseno.limpiarPrevia();
        this.toast.show('Diseño quitado. Vuelve el aspecto predeterminado.');
      },
      error: () => this.toast.show('No se pudo quitar el diseño')
    });
  }

  quitarDisenoTarjeta(): void {
    this.acentoTarjeta = '';
    this.secundarioTarjeta = '';
    this.cssTarjeta = '';
    this.previsualizar();
    this.guardarDiseno('Tu tarjeta vuelve a usar el diseño de tu perfil');
  }
}
