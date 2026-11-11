import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Empresa, MiembroEmpresa } from '../../../core/models/empresa.model';
import { AuthService } from '../../../core/services/auth.service';
import { EmpresaService } from '../../../core/services/empresa.service';
import { UserDirectoryService } from '../../../core/services/user-directory.service';
import { SidePanelService } from '../../../core/services/side-panel.service';
import { ToastService } from '../../../core/services/toast.service';
import { BusquedaRedService, ResultadoRed } from '../../../core/services/busqueda-red.service';

type PanelAbierto = 'miembros' | 'espacios' | 'cuenta' | 'proponer' | null;

@Component({
  selector: 'app-empresa-red-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './empresa-red-navbar.component.html',
  styleUrls: ['./empresa-red-navbar.component.scss'],
})
export class EmpresaRedNavbarComponent implements OnInit {
  @Input({ required: true }) empresa!: Empresa;
  @Input() equipo: MiembroEmpresa[] = [];
  @Input() espacios: { nombre: string; slug: string }[] = [];
  @Input() espacioActivo: string | null = null;
  @Input() haySesion = false;
  @Input() siguiendo = false;
  @Input() puedeEditar = false;
  @Input() urlEspacio: string | null = null;

  readonly panel = signal<PanelAbierto>(null);
  readonly buscadorAbierto = signal(false);
  readonly publicando = signal(false);
  borrador = '';

  private auth = inject(AuthService);
  private empresas = inject(EmpresaService);
  private directorio = inject(UserDirectoryService);
  private panelLateral = inject(SidePanelService);
  private toast = inject(ToastService);
  readonly red = inject(BusquedaRedService);
  private router = inject(Router);
  private elRef = inject(ElementRef);

  readonly usuario = this.auth.currentUser;

  get urlEnlaces(): string {
    return '/app/empresa/enlaces';
  }

  get urlTarjetas(): string {
    return '/app/empresa/tarjetas';
  }

  ngOnInit(): void {
    if (this.haySesion) {
      this.directorio.cargarRed().subscribe({ error: () => {} });
    }
  }

  abrirBuscador(): void {
    this.buscadorAbierto.set(!this.buscadorAbierto());
    if (!this.buscadorAbierto()) this.red.limpiar();
  }

  buscar(evento: Event): void {
    this.red.buscar((evento.target as HTMLInputElement).value);
  }

  irA(resultado: ResultadoRed): void {
    this.buscadorAbierto.set(false);
    this.red.ir(resultado);
  }

  get urlPerfil(): string {
    return `/empresa/${this.empresa?.slug ?? ''}`;
  }

  get iniciales(): string {
    return this.inicialesDe(this.empresa?.nombre ?? '');
  }

  get inicialesUsuario(): string {
    return this.inicialesDe(this.usuario()?.fullName ?? '');
  }

  get nombreUsuario(): string {
    return this.usuario()?.fullName ?? 'Mi cuenta';
  }

  get correoUsuario(): string {
    return this.usuario()?.email ?? '';
  }

  get miRol(): MiembroEmpresa | undefined {
    const id = this.usuario()?.id;
    if (!id) return undefined;

    return this.equipo.find((miembro) => miembro.usuarioId === id);
  }

  get soyMiembro(): boolean {
    return Boolean(this.miRol);
  }

  get esSeguidor(): boolean {
    return this.siguiendo;
  }

  get urlMiPerfil(): string {
    const usuario = this.usuario()?.gitUsername || this.usuario()?.id;
    return usuario ? `/app/perfil/${usuario}` : '/app/perfil';
  }

  inicialesDe(nombre: string): string {
    const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '?';
    return partes.length === 1
      ? partes[0].slice(0, 2).toUpperCase()
      : (partes[0][0] + partes[1][0]).toUpperCase();
  }

  alternar(cual: Exclude<PanelAbierto, null>): void {
    this.panel.update((valor) => (valor === cual ? null : cual));
  }

  cerraPanel(): void {
    this.panel.set(null);
  }

  @HostListener('document:click', ['$event'])
  alClicFuera(evento: MouseEvent): void {
    if (!this.panel()) return;
    if (!this.elRef.nativeElement.contains(evento.target)) this.panel.set(null);
  }

  irAMiPerfil(): void {
    this.panel.set(null);
    void this.router.navigateByUrl(this.urlMiPerfil);
  }

  irAlFeed(): void {
    this.panel.set(null);
    void this.router.navigate(['/app']);
  }

  irAAjustes(): void {
    this.panel.set(null);
    void this.router.navigate(['/app/ajustes/cuenta']);
  }

  irASeguridad(): void {
    this.panel.set(null);
    void this.router.navigate(['/app/ajustes/seguridad']);
  }

  irAMiEmpresa(): void {
    this.panel.set(null);
    void this.router.navigate(['/app/empresa']);
  }

  escribirAMiembro(miembro: MiembroEmpresa): void {
    if (!this.haySesion) {
      this.toast.show('Entra a N-soft para escribirle');
      void this.router.navigate(['/acceso']);
      return;
    }

    this.panelLateral.abrirChatCon({
      id: miembro.usuarioId,
      name: miembro.nombre,
      avatar: miembro.avatarUrl ?? null,
      statusText: miembro.puesto || miembro.rolEtiqueta,
    });
  }

  abrirPropuesta(): void {
    if (!this.haySesion) {
      this.toast.show('Entra a N-soft para proponer una publicación');
      void this.router.navigate(['/acceso']);
      return;
    }

    this.panel.set('proponer');
  }

  enviarPropuesta(): void {
    const texto = this.borrador.trim();
    if (!texto || this.publicando()) return;

    this.publicando.set(true);

    this.empresas.proponerEnRed(this.empresa.id, texto).subscribe({
      next: (publicacion) => {
        const aprobada = publicacion.estado === 'APROBADA';

        this.publicando.set(false);
        this.borrador = '';
        this.panel.set(null);

        this.toast.show(
          aprobada
            ? 'Publicado en el muro de la empresa'
            : `Enviado a ${this.empresa.nombre}: debe aprobarlo para aparecer`,
        );

        window.dispatchEvent(new CustomEvent('empresa-red-actualizar'));
      },
      error: (err) => {
        this.publicando.set(false);
        this.toast.show(err?.error?.message || 'No se pudo enviar la publicación');
      },
    });
  }

  etiquetaRol(): string {
    if (this.miRol) return this.miRol.rolEtiqueta;
    if (this.esSeguidor) return 'Sigues a esta empresa';
    return 'Visitaste este perfil';
  }
}
