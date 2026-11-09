import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ComponenteLienzo, DisenoLienzo, TipoComponente } from '../../../core/models/empresa.model';
import { EmpresaService } from '../../../core/services/empresa.service';
import { AuthService } from '../../../core/services/auth.service';
import { EmpresaComponenteVistaComponent } from '../componente-vista/empresa-componente-vista.component';

/**
 * Página propia de un diseño público: /diseno/{slug}.
 * Arriba el nombre de la empresa (para volver a su perfil) y debajo las piezas
 * una tras otra, sin el lienzo escalado, para que se lean bien en el móvil.
 */
@Component({
  selector: 'app-diseno-publico',
  standalone: true,
  imports: [CommonModule, RouterLink, EmpresaComponenteVistaComponent],
  templateUrl: './diseno-publico.component.html',
  styleUrls: ['./diseno-publico.component.scss'],
})
export class DisenoPublicoComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private servicio = inject(EmpresaService);
  private auth = inject(AuthService);

  readonly diseno = signal<DisenoLienzo | null>(null);
  readonly cargando = signal(true);
  /** Quien administra ve la vista previa y las herramientas; el visitante solo el resultado. */
  readonly esAutor = signal(false);
  readonly verDiagnostico = signal(false);
  readonly error = signal<string | null>(null);

  readonly piezas = computed<ComponenteLienzo[]>(() =>
    [...(this.diseno()?.piezas ?? [])]
      .filter((pieza) => pieza.visible && pieza.tipo !== 'SEPARADOR')
      .sort((a, b) => (a.detras === b.detras ? a.capa - b.capa : a.detras ? -1 : 1)),
  );

  readonly urlPerfil = computed(() => {
    const slug = this.diseno()?.empresaSlug;
    return slug ? `/empresa/${slug}` : '/';
  });

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');

    if (!slug) {
      this.cargando.set(false);
      this.error.set('Este enlace no apunta a ningún diseño.');
      return;
    }

    // 1) Con sesión: vista previa (sirve incluso si el diseño es privado).
    if (this.auth.currentUser()) {
      this.servicio.disenoPrivado(slug).subscribe((privado) => {
        if (privado) {
          this.esAutor.set(true);
          this.diseno.set(privado);
          this.cargando.set(false);
          return;
        }

        this.cargarPublico(slug);
      });
      return;
    }

    this.cargarPublico(slug);
  }

  private cargarPublico(slug: string): void {
    this.servicio.disenoPublico(slug).subscribe((datos) => {
      this.cargando.set(false);

      if (!datos) {
        this.error.set('Ese diseño no está publicado o ya no existe.');
        return;
      }

      this.diseno.set(datos);
    });
  }

  ngOnDestroy(): void {
    // sin hojas globales: el diseño propio de la empresa no se aplica aquí
  }

  iniciales(nombre: string | null | undefined): string {
    const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return 'E';
    return partes.length === 1
      ? partes[0].slice(0, 2).toUpperCase()
      : (partes[0][0] + partes[1][0]).toUpperCase();
  }

  alto(pieza: ComponenteLienzo): number {
    return Math.max(160, pieza.alto ?? 200);
  }

  /** En modo sección la pieza solo ocupa lo que mide su contenido. */
  ajuste(pieza: ComponenteLienzo): 'cubrir' | 'seccion' {
    try {
      return JSON.parse(pieza.contenido ?? '{}')?.ajuste === 'seccion' ? 'seccion' : 'cubrir';
    } catch {
      return 'cubrir';
    }
  }

  /** Ver el HTML de una pieza sin el visor (diagnóstico). */
  readonly verHtml = signal<string | null>(null);

  alternarVerHtml(pieza: ComponenteLienzo): void {
    this.verHtml.set(this.verHtml() === pieza.id ? null : (pieza.id ?? null));
  }

  htmlDe(pieza: ComponenteLienzo): string {
    try {
      return String(JSON.parse(pieza.contenido ?? '{}')?.html ?? '').slice(0, 1500);
    } catch {
      return '(contenido ilegible)';
    }
  }

  get totalPiezas(): number {
    return this.piezas().length;
  }

  /** Diagnóstico de depuración: solo lo ve quien administra el diseño. */
  get diagnostico(): string {
    const piezas = this.diseno()?.piezas ?? [];
    return piezas
      .map((pieza) => `${pieza.tipo} (${(pieza.contenido ?? '').length} car.)`)
      .join(' · ') || 'sin piezas';
  }
}
