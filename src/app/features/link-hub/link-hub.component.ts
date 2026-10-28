// src/app/features/link-hub/link-hub.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { LinkItem, LinkItemPayload } from '../../core/models/LinkItem';
import { LinkHubService } from '../../core/services/link-hub.service';

@Component({
  selector: 'app-link-hub',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './link-hub.component.html',
  styleUrls: ['./link-hub.component.scss']
})
export class LinkHubComponent implements OnInit {
  private readonly linkService = inject(LinkHubService);

  availableIcons = [
    { id: 'globe',  name: 'Web',      class: 'fas fa-globe' },
    { id: 'github', name: 'GitHub',   class: 'fab fa-github' },
    { id: 'book',   name: 'Docs',     class: 'fas fa-book' },
    { id: 'code',   name: 'Código',   class: 'fas fa-code' },
    { id: 'rocket', name: 'Proyecto', class: 'fas fa-rocket' }
  ];

  links: LinkItem[] = [];

  isLoading = false;
  isSaving = false;
  errorMessage: string | null = null;

  isModalOpen = false;
  isEditing = false;
  formData: LinkItem = this.getEmptyForm();

  ngOnInit(): void {
    this.loadLinks();
  }

  // ---------- Carga ----------
  loadLinks(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.linkService.getAll()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (data) => {
          this.links = data;
          this.ensureSingleActive();
        },
        error: (err) => {
          console.error(err);
          this.errorMessage = 'No se pudieron cargar los enlaces.';
        }
      });
  }

  // ---------- Helpers ----------
  private getEmptyForm(): LinkItem {
    return {
      id: '',
      title: '',
      url: '',
      iconClass: 'fas fa-globe',
      description: '',
      active: false
    };
  }

  get activeLink(): LinkItem | undefined {
    return this.links.find(l => l.active);
  }

  private ensureSingleActive(): void {
    const active = this.links.filter(l => l.active);
    if (active.length > 1) {
      let first = true;
      this.links.forEach(l => {
        if (l.active && first) first = false;
        else l.active = false;
      });
    }
  }

  // ---------- Activar ----------
  setActiveLink(id: string, event?: Event): void {
    if (event) event.stopPropagation();
    const current = this.links.find(l => l.id === id);
    if (!current || current.active) return;

    this.linkService.setActive(id).subscribe({
      next: () => {
        // Actualización optimista local
        this.links.forEach(l => (l.active = l.id === id));
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'No se pudo activar el enlace.';
      }
    });
  }

  // ---------- Modal ----------
  openCreateModal(): void {
    this.isEditing = false;
    this.formData = this.getEmptyForm();
    if (!this.activeLink) this.formData.active = true;
    this.isModalOpen = true;
  }

  openEditModal(link: LinkItem, event?: Event): void {
    if (event) event.stopPropagation();
    this.isEditing = true;
    this.formData = { ...link };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.formData = this.getEmptyForm();
  }

  // ---------- Guardar (create / update) ----------
  saveLink(): void {
    if (!this.formData.title.trim() || !this.formData.url.trim()) return;

    const payload: LinkItemPayload = {
      title: this.formData.title.trim(),
      url: this.formData.url.trim(),
      iconClass: this.formData.iconClass,
      description: this.formData.description?.trim() || '',
      active: this.formData.active
    };

    this.isSaving = true;
    this.errorMessage = null;

    const request$ = this.isEditing
      ? this.linkService.update(this.formData.id, payload)
      : this.linkService.create(payload);

    request$.pipe(finalize(() => this.isSaving = false)).subscribe({
      next: (saved) => {
        if (this.isEditing) {
          const i = this.links.findIndex(l => l.id === saved.id);
          if (i !== -1) this.links[i] = saved;
        } else {
          this.links.push(saved);
        }

        if (saved.active) {
          this.links.forEach(l => (l.active = l.id === saved.id));
        }

        this.ensureSingleActive();
        this.closeModal();
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'No se pudo guardar el enlace.';
      }
    });
  }

  // ---------- Eliminar ----------
  deleteLink(id: string, event?: Event): void {
    if (event) event.stopPropagation();

    this.linkService.delete(id).subscribe({
      next: () => {
        const wasActive = this.links.find(l => l.id === id)?.active ?? false;
        this.links = this.links.filter(l => l.id !== id);

       
        if (wasActive && this.links.length > 0) {
          const first = this.links[0];
          this.linkService.setActive(first.id).subscribe({
            next: () => this.links.forEach(l => (l.active = l.id === first.id)),
            error: (err) => console.error(err)
          });
        }
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = 'No se pudo eliminar el enlace.';
      }
    });
  }

  selectIcon(iconClass: string): void {
    this.formData.iconClass = iconClass;
  }
}