import { Injectable, signal, inject } from '@angular/core';

export interface ConfirmationConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  icon?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfirmationModalService {
  private readonly _isOpen = signal(false);
  private readonly _config = signal<ConfirmationConfig | null>(null);
  private _resolveFn: ((value: boolean) => void) | null = null;
  private _clearTimer: ReturnType<typeof setTimeout> | null = null;

  readonly isOpen = this._isOpen.asReadonly();
  readonly config = this._config.asReadonly();

  confirm(config: ConfirmationConfig): Promise<boolean> {
    // Si ya había una pregunta abierta, se da por cancelada para no dejar su promesa colgada.
    if (this._resolveFn) {
      this._resolveFn(false);
      this._resolveFn = null;
    }
    if (this._clearTimer) {
      clearTimeout(this._clearTimer);
      this._clearTimer = null;
    }

    return new Promise((resolve) => {
      this._config.set({
        confirmText: 'Confirmar',
        cancelText: 'Cancelar',
        type: 'danger',
        icon: 'fa-solid fa-triangle-exclamation',
        ...config,
      });
      this._isOpen.set(true);
      this._resolveFn = resolve;
    });
  }

  // Convenience methods for common use cases
  confirmDelete(itemName?: string): Promise<boolean> {
    return this.confirm({
      title: 'Eliminar elemento',
      message: itemName
        ? `¿Estás seguro de que quieres eliminar "${itemName}"? Esta acción no se puede deshacer.`
        : '¿Estás seguro de que quieres eliminar este elemento? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
      icon: 'fa-solid fa-trash',
    });
  }

  confirmRemove(what: string, message?: string): Promise<boolean> {
    return this.confirm({
      title: 'Confirmar acción',
      message: message ?? `¿Seguro que quieres quitar ${what}?`,
      confirmText: 'Quitar',
      cancelText: 'Cancelar',
      type: 'danger',
      icon: 'fa-solid fa-user-minus',
    });
  }

  confirmLogout(): Promise<boolean> {
    return this.confirm({
      title: 'Cerrar sesión',
      message: '¿Estás seguro de que quieres cerrar tu sesión?',
      confirmText: 'Cerrar sesión',
      cancelText: 'Cancelar',
      type: 'warning',
      icon: 'fa-solid fa-arrow-right-from-bracket',
    });
  }

  confirmDiscardChanges(): Promise<boolean> {
    return this.confirm({
      title: 'Descartar cambios',
      message: 'Tienes cambios sin guardar. ¿Seguro que quieres salir sin guardar?',
      confirmText: 'Descartar',
      cancelText: 'Seguir editando',
      type: 'warning',
      icon: 'fa-solid fa-rotate-left',
    });
  }

  confirmAction(title: string, message: string, confirmText = 'Confirmar'): Promise<boolean> {
    return this.confirm({
      title,
      message,
      confirmText,
      cancelText: 'Cancelar',
      type: 'info',
      icon: 'fa-solid fa-circle-question',
    });
  }

  close(result: boolean = false): void {
    if (!this._isOpen()) return;

    this._isOpen.set(false);
    if (this._resolveFn) {
      this._resolveFn(result);
      this._resolveFn = null;
    }
    // Se limpia la config un momento después; si mientras tanto se abre otro modal, no se toca.
    this._clearTimer = setTimeout(() => {
      if (!this._isOpen()) this._config.set(null);
      this._clearTimer = null;
    }, 200);
  }
}