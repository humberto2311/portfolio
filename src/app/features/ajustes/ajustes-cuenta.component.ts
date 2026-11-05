import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AuthService, EstadoCuenta } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
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
export class AjustesCuentaComponent implements OnInit {
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private resume = inject(ResumeService);
  private resumeSave = inject(ResumeSaveService);

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

  ngOnInit(): void {
    this.cargarEstado();
    this.cargarCv();
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
}
