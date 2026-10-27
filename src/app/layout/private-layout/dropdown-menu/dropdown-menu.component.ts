import { Component, signal, HostListener, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface MenuItem {
  label: string;
  icon: string; // Ahora recibe clases de FontAwesome
  route: string;
}

@Component({
  selector: 'app-dropdown-menu',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './dropdown-menu.component.html',
  styleUrls: ['./dropdown-menu.component.scss']
})
export class DropdownMenuComponent {
  private elRef = inject(ElementRef);
  readonly open = signal(false);

  // RUTAS ACTUALIZADAS CON EL PREFIJO /app Y ICONOS FONTAWESOME
  readonly items: MenuItem[] = [
    { label: 'Comunidad', icon: 'fa-solid fa-globe', route: '/app/comunidad' }, 
    { label: 'construir', icon: 'fa-solid fa-fire', route: '/app/portafolio' },
    { label: 'cv', icon: 'fa-solid fa-handshake' , route: '/app/informacion-personal' },
    { label: 'Hub de Enlaces', icon: 'fas fa-network-wired', route: '/app/hub' },
    { label: 'Perfil', icon: 'fas fa-id-badge', route: '/app/perfil' }, 
    { label: 'Proyectos', icon: 'fas fa-project-diagram', route: '/app/proyectos' },
    { label: 'panel', icon: 'fas fa-chart-pie', route: '/app' },
    
    // { label: 'Reportes', icon: 'fas fa-chart-line', route: '/app/reportes' },
  ];

  toggle() { 
    this.open.update(v => !v); 
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    if (!this.elRef.nativeElement.contains(e.target)) {
      this.open.set(false);
    }
  }
}