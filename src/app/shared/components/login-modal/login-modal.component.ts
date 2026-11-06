import { Component, inject, signal, effect, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Capacitor } from '@capacitor/core';
import { ModalService } from '../../../core/services/modal.service';
import { AuthService } from '../../../core/services/auth.service';

/** La contraseña solo debe coincidir cuando se está creando la cuenta. */
function coincideConPassword(control: AbstractControl): ValidationErrors | null {
  const form = control.parent;
  if (!form || !control.value) return null;
  return form.get('password')?.value === control.value ? null : { clavesDistintas: true };
}

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.scss']
})
export class LoginModalComponent implements OnInit {
  modalSvc = inject(ModalService);
  auth = inject(AuthService);
  private fb = inject(FormBuilder);

  readonly showPassword = signal(false);
  readonly maxDate = new Date().toISOString().split('T')[0];

  /** Google rechaza el user-agent embebido del WebView, así que en la app solo queda correo + código. */
  readonly nativa = Capacitor.isNativePlatform();

  /** Los 6 dígitos que llegaron por correo. */
  codigo = '';

  form = this.fb.group({
    name: [''],
    phone: [''],
    gender: [''],
    birthDate: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', coincideConPassword]
  });

  readonly esRegistro = computed(() => this.modalSvc.loginTab() === 'register');

  /** 0 = vacía, 4 = sólida. Suma longitud, mayúsculas, números y símbolos. */
  readonly fuerza = computed(() => {
    const clave = this.form.get('password')?.value ?? '';
    let nivel = 0;
    if (clave.length >= 8) nivel++;
    if (clave.length >= 12) nivel++;
    if (/[A-ZÁÉÍÓÚÑ]/.test(clave) && /[a-z]/.test(clave)) nivel++;
    if (/[0-9]/.test(clave) && /[^A-Za-z0-9]/.test(clave)) nivel++;
    return nivel;
  });

  readonly etiquetaFuerza = computed(() =>
    ['muy corta', 'débil', 'aceptable', 'buena', 'excelente'][this.fuerza()]);

  constructor() {
    effect(() => {
      const esRegistro = this.esRegistro();
      const nameCtrl = this.form.get('name')!;
      const phoneCtrl = this.form.get('phone')!;
      const genderCtrl = this.form.get('gender')!;
      const birthDateCtrl = this.form.get('birthDate')!;
      const confirmCtrl = this.form.get('confirmPassword')!;

      if (esRegistro) {
        nameCtrl.setValidators([Validators.required, Validators.minLength(2)]);
        // Regex para teléfonos internacionales o locales
        phoneCtrl.setValidators([Validators.required, Validators.pattern('^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\\s\\./0-9]*$')]);
        genderCtrl.setValidators([Validators.required]);
        birthDateCtrl.setValidators([Validators.required]);
        confirmCtrl.setValidators([Validators.required, coincideConPassword]);
      } else {
        nameCtrl.clearValidators();
        phoneCtrl.clearValidators();
        genderCtrl.clearValidators();
        birthDateCtrl.clearValidators();
        confirmCtrl.clearValidators();
      }

      nameCtrl.updateValueAndValidity({ emitEvent: false });
      phoneCtrl.updateValueAndValidity({ emitEvent: false });
      genderCtrl.updateValueAndValidity({ emitEvent: false });
      birthDateCtrl.updateValueAndValidity({ emitEvent: false });
      confirmCtrl.updateValueAndValidity({ emitEvent: false });
    });
  }

  ngOnInit() {
    // Si el usuario abre el modal, nos aseguramos de que empiece limpio
    this.form.reset();
  }

  switchTab(tab: 'login' | 'register') {
    this.modalSvc.loginTab.set(tab);
    this.auth.cancelarVerificacion();
    this.codigo = '';
    this.form.reset();
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, email, password, confirmPassword, phone, gender, birthDate } = this.form.value;

    if (this.esRegistro()) {
      this.auth.register({
        name: name!, email: email!, password: password!,
        confirmPassword: confirmPassword ?? '', phone: phone ?? '',
        gender: gender ?? '', birthDate: birthDate ?? ''
      });
    } else {
      this.auth.login(email!, password!);
    }
  }

  verificar() {
    this.auth.verificarCodigo(this.codigo);
  }

  /** La caja de código solo acepta dígitos. */
  escribirCodigo(valor: string) {
    this.codigo = (valor ?? '').replace(/\D/g, '').slice(0, 6);
  }

  /** Al cambiar la contraseña hay que volver a comparar la confirmación. */
  revalidarConfirmacion() {
    this.form.get('confirmPassword')?.updateValueAndValidity();
  }

  reenviar() {
    this.auth.reenviarCodigo();
  }

  volverAlFormulario() {
    this.auth.cancelarVerificacion();
    this.codigo = '';
  }

  close() {
    this.modalSvc.closeLogin();
    this.auth.cancelarVerificacion();
    this.codigo = '';
    this.form.reset();
  }
}
