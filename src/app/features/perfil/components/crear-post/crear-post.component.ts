import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PerfilService } from '../../../../core/services/perfil.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-crear-post',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crear-post.component.html',
  styleUrls: ['./crear-post.component.scss']
})
export class CrearPostComponent {
  private perfilService = inject(PerfilService);
  private authService = inject(AuthService); 
  texto = '';
  imagenPreview = signal<string | null>(null);


   get inicialesUsuario(): string {
    const user = this.authService.currentUser();
    if (!user || !user.fullName) return '?';
    
    const partes = user.fullName.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    
    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  }
  
  onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.imagenPreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  abrirPicker(): void {
    document.getElementById('post-image-input')?.click();
  }

  limpiarImagen(): void {
    this.imagenPreview.set(null);
    (document.getElementById('post-image-input') as HTMLInputElement).value = '';
  }

  publicar(): void {
    const txt = this.texto.trim();
    if (!txt && !this.imagenPreview()) return;

    this.perfilService.crearPublicacion(txt, this.imagenPreview() || undefined);
    this.texto = '';
    this.limpiarImagen();
  }
}