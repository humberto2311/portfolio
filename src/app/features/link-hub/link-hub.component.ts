// src/app/features/link-hub/link-hub.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { LinkItem, LinkItemPayload } from '../../core/models/LinkItem';
import { LinkHubService } from '../../core/services/link-hub.service';
import { ResumeSaveService } from '../../core/services/resume-save.service';
import { EmpresaService } from '../../core/services/empresa.service';

@Component({
  selector: 'app-link-hub',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './link-hub.component.html',
  styleUrls: ['./link-hub.component.scss']
})
export class LinkHubComponent implements OnInit {
  private readonly linkService = inject(LinkHubService);
  private readonly resumeSave = inject(ResumeSaveService);
  private readonly empresas = inject(EmpresaService);

  availableIcons = [
    { id: 'globe',  name: 'Web',      class: 'fas fa-globe' },
    { id: 'github', name: 'GitHub',   class: 'fab fa-github' },
    { id: 'book',   name: 'Docs',     class: 'fas fa-book' },
    { id: 'code',   name: 'Código',   class: 'fas fa-code' },
    { id: 'rocket', name: 'Proyecto', class: 'fas fa-rocket' }
  ];

  links: LinkItem[] = [];
  enlacesEmpresa: LinkItem[] = [];
  empresaId: string | null = null;
  empresaNombre = '';
  puedeEditarEmpresa = false;
  cargandoEmpresa = false;
  ambito: 'personal' | 'empresa' = 'personal';

  isLoading = false;
  isSaving = false;
  alternandoCvId: string | null = null;
  errorMessage: string | null = null;

  isModalOpen = false;
  isEditing = false;
  formData: LinkItem = this.getEmptyForm();

  ngOnInit(): void {
    this.loadLinks();
    this.loadEmpresa();
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

  loadEmpresa(): void {
    const empresa = this.empresas.empresaActual();
    if (!empresa?.id) return;

    this.empresaId = empresa.id;
    this.empresaNombre = empresa.nombre;
    this.puedeEditarEmpresa = (empresa.rolPropio ?? 'VISOR').toUpperCase() !== 'VISOR';
    this.cargandoEmpresa = true;

    this.linkService
      .getDeEmpresa(empresa.id)
      .pipe(finalize(() => (this.cargandoEmpresa = false)))
      .subscribe({
        next: (data) => (this.enlacesEmpresa = data),
        error: () => (this.enlacesEmpresa = [])
      });
  }

  get enlacesVisibles(): LinkItem[] {
    return this.ambito === 'empresa' ? this.enlacesEmpresa : this.links;
  }

  get enlaceActivo(): LinkItem | undefined {
    return this.enlacesVisibles.find((enlace) => enlace.active);
  }

  get enEmpresa(): boolean {
    return this.ambito === 'empresa';
  }

  cambiarAmbito(ambito: 'personal' | 'empresa'): void {
    this.ambito = ambito;
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

    if (this.enEmpresa) {
      if (!this.puedeEditarEmpresa || !this.empresaId) return;
      const actual = this.enlacesEmpresa.find((l) => l.id === id);
      if (!actual || actual.active) return;

      this.linkService.actualizarDeEmpresa(this.empresaId, id, { ...actual, active: true } as LinkItemPayload).subscribe({
        next: () => this.enlacesEmpresa.forEach((l) => (l.active = l.id === id)),
        error: () => (this.errorMessage = 'No se pudo activar el enlace de la empresa.')
      });
      return;
    }

    const current = this.links.find(l => l.id === id);
    if (!current || current.active) return;

    this.linkService.setActive(id).subscribe({
      next: () => {
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

    if (this.enEmpresa) {
      if (!this.empresaId) return;
      const request$ = this.isEditing
        ? this.linkService.actualizarDeEmpresa(this.empresaId, this.formData.id, payload)
        : this.linkService.crearDeEmpresa(this.empresaId, payload);

      request$.pipe(finalize(() => (this.isSaving = false))).subscribe({
        next: (saved) => {
          const i = this.enlacesEmpresa.findIndex((l) => l.id === saved.id);
          if (i !== -1) this.enlacesEmpresa[i] = saved;
          else this.enlacesEmpresa.push(saved);

          if (saved.active) this.enlacesEmpresa.forEach((l) => (l.active = l.id === saved.id));
          this.closeModal();
        },
        error: (err) => {
          console.error(err);
          this.errorMessage = 'No se pudo guardar el enlace de la empresa.';
        }
      });
      return;
    }

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

    if (this.enEmpresa) {
      if (!this.empresaId) return;
      this.linkService.borrarDeEmpresa(this.empresaId, id).subscribe({
        next: () => (this.enlacesEmpresa = this.enlacesEmpresa.filter((l) => l.id !== id)),
        error: () => (this.errorMessage = 'No se pudo eliminar el enlace de la empresa.')
      });
      return;
    }

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

  // ---------- Enlace de la hoja de vida ----------
  esDelCv(link: LinkItem): boolean {
    return link.kind === 'cv';
  }

  /** El estado público se lee del perfil en cada GET, nunca se guarda en el enlace. */
  estaPublicado(link: LinkItem): boolean {
    return this.esDelCv(link) && link.isPublic === true;
  }

  cambiarPublicidad(link: LinkItem, event?: Event): void {
    if (event) event.stopPropagation();
    if (!link.profileId || link.id === this.alternandoCvId) return;

    const publicar = !this.estaPublicado(link);
    this.alternandoCvId = link.id;
    this.errorMessage = null;

    const accion$ = publicar
      ? this.resumeSave.publishProfile(link.profileId)
      : this.resumeSave.unpublishProfile(link.profileId);

    accion$.subscribe({
      next: (profile) => {
        link.isPublic = !!profile.isPublic;
        this.alternandoCvId = null;
      },
      error: () => {
        this.alternandoCvId = null;
        this.errorMessage = publicar
          ? 'No se pudo publicar la hoja de vida.'
          : 'No se pudo privatizar la hoja de vida.';
      }
    });
  }

  selectIcon(iconClass: string): void {
    this.formData.iconClass = iconClass;
  }
}