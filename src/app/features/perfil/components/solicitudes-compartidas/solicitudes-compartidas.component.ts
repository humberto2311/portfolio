import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { PostDto, ShareDto } from '../../../../core/models/perfil.model';
import { PerfilService } from '../../../../core/services/perfil.service';
import { ShareService } from '../../../../core/services/share.service';
import { ToastService } from '../../../../core/services/toast.service';

interface SolicitudVm {
  id: string;
  deNombre: string;
  deIniciales: string;
  deId?: string;
  deUsername?: string;
  mensaje?: string;
  textoPost: string;
  imagenPost?: string;
  tiempo: string;
  post: PostDto;
  resolviendo: boolean;
}

@Component({
  selector: 'app-solicitudes-compartidas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './solicitudes-compartidas.component.html',
  styleUrls: ['./solicitudes-compartidas.component.scss'],
})
export class SolicitudesCompartidasComponent implements OnInit {
  private shareService = inject(ShareService);
  private perfilService = inject(PerfilService);
  private toast = inject(ToastService);
  private router = inject(Router);

  private enProceso = signal<string[]>([]);

  solicitudes = computed<SolicitudVm[]>(() =>
    this.shareService.pendientes().map((s) => this.aVm(s))
  );

  ngOnInit(): void {
    this.shareService.cargarPendientes();
  }

  private aVm(s: ShareDto): SolicitudVm {
    const nombre = s.sharedBy?.fullName || 'Alguien';
    return {
      id: s.id,
      deNombre: nombre,
      deIniciales: s.sharedBy?.initials?.trim() || this.iniciales(nombre),
      deId: s.sharedBy?.id,
      deUsername: s.sharedBy?.gitUsername || undefined,
      mensaje: s.message,
      textoPost: s.post?.content || 'Publicación con imagen',
      imagenPost: s.post?.imageUrl,
      tiempo: this.tiempoRelativo(s.createdAt),
      post: s.post,
      resolviendo: this.enProceso().includes(s.id),
    };
  }

  private iniciales(nombre: string): string {
    if (!nombre) return '?';
    const partes = nombre.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  }

  private tiempoRelativo(iso: string): string {
    if (!iso) return '';
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    return `Hace ${Math.floor(diff / 86400)} d`;
  }

  irAlPerfil(solicitud: SolicitudVm, event: Event): void {
    event.stopPropagation();
    const destino = solicitud.deUsername || solicitud.deId;
    if (!destino) return;
    this.router.navigate(['/app/perfil', destino]);
  }

  resolver(solicitud: SolicitudVm, aceptar: boolean): void {
    if (solicitud.resolviendo) return;

    this.enProceso.update((ids) => [...ids, solicitud.id]);

    this.shareService.resolverSolicitud(solicitud.id, aceptar).subscribe({
      next: (share) => {
        this.enProceso.update((ids) => ids.filter((id) => id !== solicitud.id));

        if (aceptar) {
          this.perfilService.agregarPublicacionRecibida(share?.post ?? solicitud.post);
          this.toast.show('Publicación agregada a tu perfil');
        } else {
          this.toast.show('Solicitud rechazada');
        }
      },
      error: (err) => {
        this.enProceso.update((ids) => ids.filter((id) => id !== solicitud.id));
        this.toast.show(err?.error?.message || 'No se pudo resolver la solicitud');
      },
    });
  }
}
