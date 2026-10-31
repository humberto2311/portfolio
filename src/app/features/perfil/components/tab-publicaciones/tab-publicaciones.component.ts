import { Component, Input, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PerfilService } from '../../../../core/services/perfil.service';
import { ResumeService } from '../../../../core/services/resume.service';
import { ResumeSaveService } from '../../../../core/services/resume-save.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CrearPostComponent } from '../crear-post/crear-post.component';
import { PostCardComponent } from '../post-card/post-card.component';

@Component({
  selector: 'app-tab-publicaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, CrearPostComponent, PostCardComponent],
  templateUrl: './tab-publicaciones.component.html',
  styleUrls: ['./tab-publicaciones.component.scss'],
})
export class TabPublicacionesComponent {
  /** true cuando el perfil mostrado es el del usuario logueado. */
  @Input() esMiPerfil = false;

  perfilService = inject(PerfilService);
  private resumeService = inject(ResumeService);
  private resumeSave = inject(ResumeSaveService);
  private toast = inject(ToastService);

  publicaciones = this.perfilService.publicaciones;
  publicacionesVisibles = this.perfilService.publicacionesVisibles;

  /** Resumen corto de la hoja de vida (tarjeta "Detalles de Perfil"). */
  resumenCv = signal<string | null>(null);

  editandoResumen = signal(false);
  textoResumen = '';

  private resumeProfile: any = null;

  constructor() {
    // cuando el perfil se cargue, pedimos su feed y el resumen del CV
    effect(() => {
      const p = this.perfilService.perfil();
      if (!p?.id) return;

      this.perfilService.cargarPublicaciones(p.id);
      this.cargarResumenCv(p.id);
    });
  }

  private cargarResumenCv(userId: string): void {
    this.resumenCv.set(null);
    this.resumeProfile = null;

    this.resumeService.getProfileByUserId(userId).subscribe({
      next: (rp) => {
        this.resumeProfile = rp;
        const texto = (rp?.summary || rp?.shortBio || '').replace(/\s+/g, ' ').trim();
        if (texto) {
          this.resumenCv.set(
            texto.length > 220 ? texto.slice(0, 220).trim() + '…' : texto
          );
        }
      },
      error: () => this.resumenCv.set(null),
    });
  }

  // ====== EDITAR EL "DETALLES DE PERFIL" ======

  editarResumen(): void {
    this.textoResumen = this.resumenCv() ?? '';
    this.editandoResumen.set(true);
  }

  cancelarResumen(): void {
    this.editandoResumen.set(false);
  }

  guardarResumen(): void {
    const texto = this.textoResumen.trim();
    if (!texto) return;

    const id = this.resumeProfile?.id;

    if (!id) {
      this.toast.show('No hay una hoja de vida para editar');
      return;
    }

    this.resumeSave
      .updateProfile(id, { ...this.resumeProfile, summary: texto })
      .subscribe({
        next: () => {
          this.resumeProfile = { ...this.resumeProfile, summary: texto };
          this.resumenCv.set(texto);
          this.editandoResumen.set(false);
          this.toast.show('Resumen actualizado');
        },
        error: () => this.toast.show('No se pudo guardar el resumen'),
      });
  }
}
