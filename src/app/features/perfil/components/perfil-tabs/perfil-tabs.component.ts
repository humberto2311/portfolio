import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TabId } from '../../../../core/models/perfil.model';

@Component({
  selector: 'app-perfil-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil-tabs.component.html',
  styleUrls: ['./perfil-tabs.component.scss']
})
export class PerfilTabsComponent {
  @Input({ required: true }) tabActiva!: TabId;
  @Input() mostrarEmpresa = false;
  @Output() tabChanged = new EventEmitter<TabId>();

  tabs: { id: TabId; label: string; icon: string; soloPc?: boolean }[] = [
    { id: 'publicaciones', label: 'Publicaciones', icon: 'fa-newspaper' },
    { id: 'informacion',   label: 'Información',   icon: 'fa-circle-info' },
    { id: 'fotos',         label: 'Fotos',         icon: 'fa-images' },
    { id: 'amigos',        label: 'Contactos',     icon: 'fa-users', soloPc: true },
    { id: 'enlaces',       label: 'Enlaces',       icon: 'fa-link' }
  ];

  get listaTabs(): { id: TabId; label: string; icon: string; soloPc?: boolean }[] {
    return this.mostrarEmpresa
      ? [...this.tabs, { id: 'empresa', label: 'Mi empresa', icon: 'fa-building' }]
      : this.tabs;
  }

  seleccionar(id: TabId): void {
    if (id !== this.tabActiva) this.tabChanged.emit(id);
  }
}