import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { LinkItem } from '../../core/models/LinkItem';
@Component({
  selector: 'app-link-hub',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './link-hub.component.html',
  styleUrls: ['./link-hub.component.scss']
})
export class LinkHubComponent implements OnInit {

  availableIcons = [
    { id: 'globe', name: 'Web', class: 'fas fa-globe' },
    { id: 'github', name: 'GitHub', class: 'fab fa-github' },
    { id: 'book', name: 'Docs', class: 'fas fa-book' },
    { id: 'code', name: 'Código', class: 'fas fa-code' },
    { id: 'rocket', name: 'Proyecto', class: 'fas fa-rocket' }
  ];

  links: LinkItem[] = [
    {
      id: '1',
      title: 'Documentación Oficial API',
      url: 'https://docs.ejemplo.com',
      iconClass: 'fas fa-book',
      description: 'Guía rápida de endpoints y arquitectura',
      active: true
    },
    {
      id: '2',
      title: 'Repositorio GitHub',
      url: 'https://github.com/ejemplo/repo',
      iconClass: 'fab fa-github',
      description: 'Código fuente del proyecto principal',
      active: false
    }
  ];

  isModalOpen: boolean = false;
  isEditing: boolean = false;
  formData: LinkItem = this.getEmptyForm();

  ngOnInit(): void {
    this.ensureSingleActive();
  }

  private getEmptyForm(): LinkItem {
    return { id: '', title: '', url: '', iconClass: 'fas fa-globe', description: '', active: false };
  }

  get activeLink(): LinkItem | undefined {
    return this.links.find(link => link.active);
  }

  private ensureSingleActive(): void {
    const activeItems = this.links.filter(l => l.active);
    if (activeItems.length > 1) {
      let foundFirst = false;
      this.links.forEach(l => {
        if (l.active && !foundFirst) { foundFirst = true; }
        else { l.active = false; }
      });
    }
  }

  setActiveLink(id: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.links.forEach(link => { link.active = (link.id === id); });
  }

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

  saveLink(): void {
    if (!this.formData.title.trim() || !this.formData.url.trim()) return;

    if (this.isEditing) {
      const index = this.links.findIndex(l => l.id === this.formData.id);
      if (index !== -1) {
        this.links[index] = { ...this.formData };
        if (this.formData.active) this.setActiveLink(this.formData.id);
      }
    } else {
      const newLink: LinkItem = { ...this.formData, id: Date.now().toString() };
      if (newLink.active || this.links.length === 0) {
        newLink.active = true;
        this.links.forEach(l => l.active = false);
      }
      this.links.push(newLink);
    }
    this.closeModal();
  }

  deleteLink(id: string, event?: Event): void {
    if (event) event.stopPropagation();
    const targetLink = this.links.find(l => l.id === id);
    const wasActive = targetLink?.active ?? false;
    this.links = this.links.filter(l => l.id !== id);
    if (wasActive && this.links.length > 0) {
      this.links[0].active = true;
    }
  }

  selectIcon(iconClass: string): void {
    this.formData.iconClass = iconClass;
  }
}