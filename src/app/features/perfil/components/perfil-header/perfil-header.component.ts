import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerfilData } from '../../../../core/models/perfil.model';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-perfil-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil-header.component.html',
  styleUrls: ['./perfil-header.component.scss']
})
export class PerfilHeaderComponent {
  @Input({ required: true }) perfil!: PerfilData;

  private toast = inject(ToastService);
  avatarUrl: string | null = null;

  onAvatarChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => (this.avatarUrl = reader.result as string);
    reader.readAsDataURL(file);
    this.toast.show('Foto de perfil actualizada');
  }

  triggerAvatar(): void {
    document.getElementById('avatar-input')?.click();
  }

  emitirAccion(msg: string): void {
    this.toast.show(msg);
  }
}