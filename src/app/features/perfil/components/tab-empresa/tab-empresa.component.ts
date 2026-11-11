import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { EmpresaPublica, EspacioEmpresa, MiembroEmpresa, PerfilRedEmpresa } from '../../../../core/models/empresa.model';
import { EmpresaService } from '../../../../core/services/empresa.service';
import { SidePanelService } from '../../../../core/services/side-panel.service';
import { ToastService } from '../../../../core/services/toast.service';

interface AccionEmpresa {
  clave: string;
  etiqueta: string;
  icono: string;
  ruta: string;
}

@Component({
  selector: 'app-tab-empresa',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tab-empresa.component.html',
  styleUrls: ['./tab-empresa.component.scss'],
})
export class TabEmpresaComponent implements OnInit {
  private empresas = inject(EmpresaService);
  private panelLateral = inject(SidePanelService);
  private toast = inject(ToastService);
  private router = inject(Router);

  readonly publica = signal<EmpresaPublica | null>(null);
  readonly red = signal<PerfilRedEmpresa | null>(null);
  readonly cargando = signal(true);

  readonly acciones: AccionEmpresa[] = [
    { clave: 'espacio', etiqueta: 'Mi espacio', icono: 'fa-solid fa-globe', ruta: '/app/empresa/espacio' },
    { clave: 'ajustes', etiqueta: 'Editar empresa', icono: 'fa-solid fa-pen-to-square', ruta: '/app/empresa/ajustes' },
    { clave: 'lienzo', etiqueta: 'Diseño', icono: 'fa-solid fa-pen-ruler', ruta: '/app/empresa/lienzo' },
    { clave: 'panel', etiqueta: 'Panel', icono: 'fa-solid fa-chart-pie', ruta: '/app/empresa' },
  ];

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);

    this.empresas.cargarMis().subscribe((lista) => {
      const propia = lista.length ? lista[0] : null;

      if (!propia) {
        this.cargando.set(false);
        return;
      }

      this.publica.set({ empresa: propia } as EmpresaPublica);
      this.empresas.perfilRed(propia.id).subscribe({
        next: (red) => {
          this.red.set(red);
          this.cargando.set(false);
        },
        error: () => {
          this.red.set(null);
          this.cargando.set(false);
        },
      });
    });
  }

  get empresa() {
    return this.publica()?.empresa ?? this.red()?.empresa ?? null;
  }

  get espacios(): EspacioEmpresa[] {
    return (this.red()?.espacios ?? []).filter((espacio) => espacio.publicado);
  }

  get miembros(): MiembroEmpresa[] {
    return this.red()?.miembros ?? [];
  }

  get puedeEditar(): boolean {
    return Boolean(this.red()?.puedeEditar);
  }

  get seguidores(): number {
    return this.red()?.seguidores ?? 0;
  }

  get publicaciones(): number {
    return this.red()?.publicaciones?.length ?? 0;
  }

  iniciales(nombre: string): string {
    const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '?';

    return partes.length === 1
      ? partes[0].slice(0, 2).toUpperCase()
      : (partes[0][0] + partes[1][0]).toUpperCase();
  }

  irAEspacio(espacio: EspacioEmpresa): void {
    const slug = this.empresa?.slug ?? '';
    void this.router.navigate(['/empresa', slug, 'espacio', espacio.slug]);
  }

  irAlPerfil(): void {
    const slug = this.empresa?.slug ?? '';
    void this.router.navigate(['/empresa', slug]);
  }

  escribirAMiembro(miembro: MiembroEmpresa): void {
    this.panelLateral.abrirChatCon({
      id: miembro.usuarioId,
      name: miembro.nombre,
      avatar: miembro.avatarUrl ?? null,
      statusText: miembro.puesto || miembro.rolEtiqueta || '',
    });
  }

  copiarEnlaceEspacio(espacio: EspacioEmpresa): void {
    const slug = this.empresa?.slug ?? '';
    const url = `${window.location.origin}/empresa/${slug}/espacio/${espacio.slug}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(
        () => this.toast.show('Enlace copiado'),
        () => this.toast.show(url),
      );
      return;
    }

    this.toast.show(url);
  }
}
