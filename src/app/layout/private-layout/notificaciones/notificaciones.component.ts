import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ShareService } from '../../../core/services/share.service';
import { ConnectionService } from '../../../core/services/connection.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConexionDto } from '../../../core/models/perfil.model';
import { SolicitudesCompartidasComponent } from '../../../features/perfil/components/solicitudes-compartidas/solicitudes-compartidas.component';

interface SeguidorVm {
  conexion: ConexionDto;
  siguiendo: boolean;
}

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [CommonModule, SolicitudesCompartidasComponent],
  templateUrl: './notificaciones.component.html',
  styleUrls: ['./notificaciones.component.scss'],
})
export class NotificacionesComponent implements OnInit, OnDestroy {
  private shareService = inject(ShareService);
  private connectionService = inject(ConnectionService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private elRef = inject(ElementRef);

  abierto = signal(false);
  pendientes = this.shareService.pendientes;
  seguidores = signal<SeguidorVm[]>([]);

  /** Punto rojo: solicitudes + gente que te sigue y aún no sigues. */
  totalNotificaciones = computed(
    () =>
      this.pendientes().length +
      this.seguidores().filter((s) => !s.siguiendo).length
  );

  private intervalo?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.refrescar();
    // Refresca solo para que el punto aparezca sin abrir el panel.
    this.intervalo = setInterval(() => this.refrescar(), 60_000);
  }

  ngOnDestroy(): void {
    if (this.intervalo) clearInterval(this.intervalo);
  }

  private refrescar(): void {
    this.shareService.cargarPendientes();
    this.cargarSeguidores();
  }

  toggle(): void {
    const abrir = !this.abierto();
    this.abierto.set(abrir);
    if (abrir) {
      this.refrescar();
    }
  }

  /**
   * Muestra a todos los que te siguen (más recientes primero).
   * Si NO los sigues aparece el botón "Seguir"; si ya los sigues,
   * la notificación queda solo como información.
   */
  private cargarSeguidores(): void {
    forkJoin({
      seguidores: this.connectionService
        .getMyFollowers()
        .pipe(catchError(() => of([] as ConexionDto[]))),
      siguiendo: this.connectionService
        .getMyFollowing()
        .pipe(catchError(() => of([] as ConexionDto[]))),
    }).subscribe({
      next: ({ seguidores, siguiendo }) => {
        const yaSigo = new Set(
          (siguiendo ?? []).map((c) => String(c.contactId))
        );

        this.seguidores.set(
          (seguidores ?? [])
            .filter((c) => !!c.userId)
            .sort((a, b) =>
              (b.connectedAt ?? '').localeCompare(a.connectedAt ?? '')
            )
            .slice(0, 6)
            .map((c) => ({
              conexion: c,
              siguiendo: yaSigo.has(String(c.userId)),
            }))
        );
      },
      error: () => this.seguidores.set([]),
    });
  }

  nombre(c: ConexionDto): string {
    return c.nombreUser || c.usernameUser || 'Usuario';
  }

  iniciales(c: ConexionDto): string {
    const nombre = this.nombre(c);
    const partes = nombre.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
  }

  irAPerfil(c: ConexionDto): void {
    const destino = c.usernameUser || c.userId;
    if (!destino) return;
    this.abierto.set(false);
    this.router.navigate(['/app/perfil', destino]);
  }

  seguirDeVuelta(c: ConexionDto, event: Event): void {
    event.stopPropagation();
    if (!c.userId) return;

    this.connectionService.followUser(c.userId).subscribe({
      next: () => {
        this.seguidores.update((lista) =>
          lista.map((s) =>
            s.conexion.userId === c.userId ? { ...s, siguiendo: true } : s
          )
        );
        this.toast.show(`Ahora sigues a ${this.nombre(c)}`);
      },
      error: () => this.toast.show('No se pudo seguir a esa persona'),
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.abierto.set(false);
    }
  }
}
