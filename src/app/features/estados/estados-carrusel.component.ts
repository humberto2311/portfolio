import { Component, OnInit, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstadosService } from '../../core/services/estados.service';
import { GrupoEstados } from '../../core/models/estado.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-estados-carrusel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estados-carrusel.component.html',
  styleUrls: ['./estados-carrusel.component.scss']
})
export class EstadosCarruselComponent implements OnInit {

  private estados = inject(EstadosService);
  private auth = inject(AuthService);

  readonly recarga = input<number>(0);
  readonly soloTextoYAudio = input(false);
  readonly cargados = output<GrupoEstados[]>();
  readonly abrirCreador = output<void>();
  readonly abrirVisor = output<GrupoEstados>();

  readonly grupos = signal<GrupoEstados[]>([]);
  readonly cargando = signal(true);

  readonly mio = computed(() => this.grupos().find((grupo) => grupo.usuarioId === this.auth.currentUser()?.id) ?? null);
  readonly otros = computed(() => this.grupos()
    .filter((grupo) => grupo.usuarioId !== this.auth.currentUser()?.id)
    .filter((grupo) => !this.soloTextoYAudio() || grupo.estados.some((estado) => this.esTextoOAudio(estado))));
  readonly iniciales = computed(() => {
    const nombre = this.auth.currentUser()?.fullName ?? 'Yo';

    return nombre.split(' ').filter(Boolean).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
  });

  constructor() {
    effect(() => {
      this.recarga();
      this.cargar();
    });
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.estados.bandeja().subscribe({
      next: (grupos) => {
        const lista = grupos ?? [];

        this.grupos.set(lista);
        this.cargados.emit(lista);
        this.cargando.set(false);
      },
      error: () => {
        this.grupos.set([]);
        this.cargando.set(false);
      }
    });
  }

  esTextoOAudio(estado: { tipo: string; musicaTitulo: string | null }): boolean {
    return estado.tipo === 'TEXTO' || !!estado.musicaTitulo;
  }

  crear(): void {
    this.abrirCreador.emit();
  }

  ver(grupo: GrupoEstados): void {
    this.abrirVisor.emit(grupo);
  }

  verMio(): void {
    const propio = this.mio();

    if (propio) {
      this.abrirVisor.emit(propio);
      return;
    }

    this.crear();
  }
}
