import { Component, ElementRef, HostListener, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationModalService, ConfirmationConfig } from '../../../core/services/confirmation-modal.service';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.scss'],
})
export class ConfirmationModalComponent {
  private modalSvc = inject(ConfirmationModalService);

  private host = inject(ElementRef<HTMLElement>);

  readonly isOpen = this.modalSvc.isOpen;
  readonly config = this.modalSvc.config;

  constructor() {
    // Al abrir, el foco va al botón "cancelar": así un Enter distraído nunca confirma un borrado.
    effect(() => {
      if (!this.isOpen()) return;
      setTimeout(() => {
        (this.host.nativeElement as HTMLElement)
          .querySelector<HTMLButtonElement>('.confirmation-btn--cancel')
          ?.focus();
      });
    });
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen()) this.onCancel();
  }

  onConfirm(): void {
    this.modalSvc.close(true);
  }

  onCancel(): void {
    this.modalSvc.close(false);
  }

  /** Clase de color del círculo contenedor (el SCSS la espera en .confirmation-icon). */
  get iconTone(): string {
    const type = this.config()?.type ?? 'danger';
    return { danger: 'text-danger', warning: 'text-warning', info: 'text-accent' }[type] ?? 'text-danger';
  }

  get iconClass(): string {
    return this.config()?.icon ?? 'fa-solid fa-triangle-exclamation';
  }
}