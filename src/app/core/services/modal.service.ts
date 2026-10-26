import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ModalService {
  readonly isLoginOpen = signal(false);
  readonly loginTab = signal<'login' | 'register'>('login');

  openLogin(tab: 'login' | 'register' = 'login') {
    this.loginTab.set(tab);
    this.isLoginOpen.set(true);
  }

  closeLogin() {
    this.isLoginOpen.set(false);
  }
}