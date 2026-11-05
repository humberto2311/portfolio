import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AuthService, EstadoCuenta } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ResumeService } from '../../core/services/resume.service';
import { VcardService } from '../../core/services/vcard.service';
import { ResumeProfile } from '../../core/models/resume.model';
import { VCardPayload } from '../../core/models/vcard.model';

@Component({
  selector: 'app-ajustes-seguridad',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './ajustes-seguridad.component.html',
  styleUrls: ['./ajustes-seguridad.component.scss']
})
export class AjustesSeguridadComponent implements OnInit {
  readonly auth = inject(AuthService);
  private toast = inject(ToastService);
  private resume = inject(ResumeService);
  private vcard = inject(VcardService);

  estado: EstadoCuenta | null = null;
  cv: ResumeProfile | null = null;
  tarjeta: VCardPayload | null = null;

  isLoading = true;
  errorMessage: string | null = null;

  reenviando = false;
  reenviado = false;

  codigo = '';
  verificando = false;

  /** El primer clic pregunta, el segundo ejecuta: cerrar sesiones no tiene undo. */
  confirmandoCierre = false;
  cerrandoSesiones = false;

  ngOnInit(): void {
    this.cargarEstado();
    this.cargarEnlacesPublicos();
  }

  private cargarEstado() {
    this.isLoading = true;
    this.auth.estado().pipe(finalize(() => (this.isLoading = false))).subscribe({
      next: (e) => (this.estado = e),
      error: () => (this.errorMessage = 'No se pudo leer el estado de tu cuenta. Vuelve a iniciar sesión.')
    });
  }

  /** Lo que quedó visible para quien tenga el enlace. */
  private cargarEnlacesPublicos(): void {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;

    this.resume.getProfileByUserId(userId).subscribe({
      next: (profile) => (this.cv = profile),
      error: () => (this.cv = null)
    });

    this.vcard.miTarjeta().subscribe({
      next: (tarjeta) => (this.tarjeta = tarjeta),
      error: () => (this.tarjeta = null)
    });
  }

  get userId(): string | null {
    return this.auth.currentUser()?.id ?? null;
  }

  get proveedorTexto(): string {
    switch (this.estado?.proveedor) {
      case 'github': return 'GitHub';
      case 'correo': return 'Correo y contraseña';
      default: return 'Proveedor externo';
    }
  }

  get ultimoAccesoTexto(): string {
    const marca = this.estado?.ultimoAcceso;
    if (!marca) return 'Todavía no lo registramos';
    const fecha = new Date(marca);
    return isNaN(fecha.getTime()) ? '—' : fecha.toLocaleString('es-CO');
  }

  reenviarCorreo() {
    const email = this.estado?.email;
    if (!email) return;

    this.reenviando = true;
    this.auth.reenviarCodigoPara(email).pipe(finalize(() => (this.reenviando = false)))
      .subscribe({
        next: (res) => {
          this.reenviado = true;
          this.toast.show(res.correoEnviado
            ? 'Te mandamos un código nuevo'
            : 'SMTP sin configurar: el código quedó en la consola del backend');
        },
        error: () => this.toast.show('No se pudo reenviar el código')
      });
  }

  escribirCodigo(valor: string) {
    this.codigo = (valor ?? '').replace(/\D/g, '').slice(0, 6);
  }

  verificarCorreo() {
    const email = this.estado?.email;
    if (!email || this.codigo.length !== 6) return;

    this.verificando = true;
    this.auth.verificarCodigo(this.codigo, email, false).subscribe((usuario) => {
      this.verificando = false;
      if (usuario) {
        this.codigo = '';
        this.toast.show('Correo verificado');
        this.cargarEstado();
      }
    });
  }

  cerrarSesiones() {
    if (!this.confirmandoCierre) {
      this.confirmandoCierre = true;
      return;
    }

    this.confirmandoCierre = false;
    this.cerrandoSesiones = true;

    this.auth.cerrarSesiones().pipe(finalize(() => (this.cerrandoSesiones = false)))
      .subscribe({
        next: () => this.toast.show('Los demás dispositivos quedaron fuera de sesión'),
        error: () => this.toast.show('No se pudieron cerrar las sesiones')
      });
  }

  get hayEnlacesPublicos(): boolean {
    return this.cvVisible || !!this.tarjeta?.slug;
  }

  get cvVisible(): boolean {
    return this.cv?.isPublic === true;
  }
}
