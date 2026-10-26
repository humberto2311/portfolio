import { Component, inject, signal, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ModalService } from '../../../core/services/modal.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.scss']
})
export class LoginModalComponent implements OnInit {
  modalSvc = inject(ModalService);
  auth = inject(AuthService);
  private fb = inject(FormBuilder);

  readonly showPassword = signal(false);
  readonly maxDate = new Date().toISOString().split('T')[0];

  form = this.fb.group({
    name: [''],
    phone: [''],
    gender: [''],
    birthDate: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  constructor() {
    effect(() => {
      const isRegister = this.modalSvc.loginTab() === 'register';
      const nameCtrl = this.form.get('name')!;
      const phoneCtrl = this.form.get('phone')!;
      const genderCtrl = this.form.get('gender')!;
      const birthDateCtrl = this.form.get('birthDate')!;

      if (isRegister) {
        nameCtrl.setValidators([Validators.required, Validators.minLength(2)]);
        // Regex para teléfonos internacionales o locales
        phoneCtrl.setValidators([Validators.required, Validators.pattern('^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\\s\\./0-9]*$')]);
        genderCtrl.setValidators([Validators.required]);
        birthDateCtrl.setValidators([Validators.required]);
      } else {
        nameCtrl.clearValidators();
        phoneCtrl.clearValidators();
        genderCtrl.clearValidators();
        birthDateCtrl.clearValidators();
      }

      nameCtrl.updateValueAndValidity();
      phoneCtrl.updateValueAndValidity();
      genderCtrl.updateValueAndValidity();
      birthDateCtrl.updateValueAndValidity();
    });
  }

  ngOnInit() {
    // Si el usuario abre el modal, nos aseguramos de que empiece limpio
    this.form.reset();
  }

  switchTab(tab: 'login' | 'register') {
    this.modalSvc.loginTab.set(tab);
    this.auth.error.set(null);
    this.form.reset();
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    
    const { name, email, password, phone, gender, birthDate } = this.form.value;
    
    if (this.modalSvc.loginTab() === 'login') {
      this.auth.login(email!, password!);
    } else {
      this.auth.register(name!, email!, password!, phone!, gender!, birthDate!);
    }
  }

  close() { 
    this.modalSvc.closeLogin(); 
    this.form.reset();
  }
}