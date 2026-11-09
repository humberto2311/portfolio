import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import {
  ComponenteLienzo,
  ContenidoGaleria,
  ContenidoHorario,
  ContenidoHtml,
  ContenidoLista,
  ContenidoMenu,
  ContenidoProducto,
  ContenidoTexto,
  Empresa,
  EmpresaPublica,
  TipoComponente,
} from '../../../core/models/empresa.model';
import { DisenoService } from '../../../core/services/diseno.service';
import { EmpresaService } from '../../../core/services/empresa.service';
import { leerJson } from '../empresa-ui';
import { EmpresaComponenteVistaComponent } from '../componente-vista/empresa-componente-vista.component';

/**
 * Página propia de un componente del lienzo: /empresa/{slug}/c/{id}.
 * Arriba lleva el nombre de la empresa para volver a su perfil, y el contenido se
 * muestra a tamaño real (sin el escalado del lienzo), listo para compartir.
 */
@Component({
  selector: 'app-empresa-componente',
  standalone: true,
  imports: [CommonModule, RouterLink, EmpresaComponenteVistaComponent],
  templateUrl: './empresa-componente.component.html',
  styleUrls: ['./empresa-componente.component.scss'],
})
export class EmpresaComponenteComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private servicio = inject(EmpresaService);
  private diseno = inject(DisenoService);
  private platformId = inject(PLATFORM_ID);

  readonly publica = signal<EmpresaPublica | null>(null);
  readonly pieza = signal<ComponenteLienzo | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly copiado = signal(false);

  readonly empresa = computed(() => this.publica()?.empresa ?? null);

  get empresaActiva(): Empresa | null {
    return this.publica()?.empresa ?? null;
  }

  /** Todas las piezas públicas, para navegar entre ellas. */
  readonly hermanas = computed<ComponenteLienzo[]>(() =>
    (this.publica()?.piezas ?? []).filter((item) => item.id !== this.pieza()?.id),
  );

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    const componenteId = this.route.snapshot.paramMap.get('componenteId');

    if (!slug || !componenteId) {
      this.cargando.set(false);
      this.error.set('Este enlace no apunta a ningún componente.');
      return;
    }

    this.servicio.cargarPublica(slug).subscribe((datos) => {
      if (datos) {
        this.publica.set(datos);
        this.diseno.aplicarAjeno({
          acento: datos.diseno.acento ?? null,
          secundario: datos.diseno.secundario ?? null,
          fondoUrl: datos.diseno.fondoUrl ?? null,
          css: datos.diseno.css ?? null,
          activo: datos.diseno.activo,
        });

        const enMemoria = (datos.piezas ?? datos.componentes ?? []).find((item) => item.id === componenteId);
        if (enMemoria) {
          this.pieza.set(enMemoria);
          this.cargando.set(false);
          return;
        }
      }

      this.servicio.cargarPiezaPublica(slug, componenteId).subscribe((componente) => {
        this.cargando.set(false);

        if (!componente) {
          this.error.set('Ese componente no está publicado o ya no existe.');
          return;
        }

        this.pieza.set(componente);
      });
    });
  }

  ngOnDestroy(): void {
    this.diseno.limpiarAjeno();
  }

  get urlPerfil(): string {
    const slug = this.empresaActiva?.slug;
    return slug ? `/empresa/${slug}` : '/empresa';
  }

  get urlPublica(): string {
    if (typeof window === 'undefined') return '';
    return window.location.href;
  }

  get titulo(): string {
    const componente = this.pieza();
    if (!componente) return 'Componente';

    const contenido = leerJson<any>(componente.contenido, {});

    const nombre =
      contenido?.titulo ??
      contenido?.nombre ??
      componente.nombre ??
      this.etiqueta(componente.tipo);

    return String(nombre);
  }

  get descripcion(): string {
    const componente = this.pieza();
    if (!componente) return '';

    const contenido = leerJson<any>(componente.contenido, {});
    const texto = contenido?.texto ?? contenido?.descripcion ?? '';
    return String(texto).slice(0, 180);
  }

  get alto(): number {
    const contenido = leerJson<any>(this.pieza()?.contenido, {});
    const alto = Number(contenido?.alto);
    const natural = this.pieza()?.alto ?? 420;

    if (Number.isFinite(alto) && alto > 0) return Math.max(alto, natural);

    return Math.max(320, natural);
  }

  get esMenu(): boolean {
    return this.pieza()?.tipo === 'MENU';
  }

  get menu(): ContenidoMenu {
    return leerJson<ContenidoMenu>(this.pieza()?.contenido, { grupos: [] });
  }

  get galeria(): ContenidoGaleria {
    return leerJson<ContenidoGaleria>(this.pieza()?.contenido, { imagenes: [] });
  }

  get horario(): ContenidoHorario {
    return leerJson<ContenidoHorario>(this.pieza()?.contenido, { filas: [] });
  }

  get lista(): ContenidoLista {
    return leerJson<ContenidoLista>(this.pieza()?.contenido, { items: [] });
  }

  get producto(): ContenidoProducto {
    return leerJson<ContenidoProducto>(this.pieza()?.contenido, { nombre: '' });
  }

  get texto(): ContenidoTexto {
    return leerJson<ContenidoTexto>(this.pieza()?.contenido, { texto: '' });
  }

  get html(): ContenidoHtml {
    return leerJson<ContenidoHtml>(this.pieza()?.contenido, { html: '' });
  }

  etiqueta(tipo: TipoComponente | string): string {
    switch (tipo) {
      case 'MENU':
        return 'Menú';
      case 'LISTA':
        return 'Lista';
      case 'GALERIA':
        return 'Galería';
      case 'HORARIO':
        return 'Horario';
      case 'PRODUCTO':
        return 'Producto';
      case 'TEXTO':
        return 'Información';
      case 'HTML':
        return 'Contenido interactivo';
      default:
        return 'Componente';
    }
  }

  enlaceHermana(componente: ComponenteLienzo): string {
    const slug = this.empresaActiva?.slug;
    return componente.enlace ?? (slug && componente.id ? `/empresa/${slug}/c/${componente.id}` : '/empresa');
  }

  nombreHermana(componente: ComponenteLienzo): string {
    const contenido = leerJson<any>(componente.contenido, {});
    return String(contenido?.titulo ?? contenido?.nombre ?? componente.nombre ?? this.etiqueta(componente.tipo));
  }

  async copiarEnlace(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !navigator.clipboard?.writeText) {
      this.error.set('Tu navegador no deja copiar. Copia la dirección de la barra.');
      return;
    }

    try {
      await navigator.clipboard.writeText(this.urlPublica);
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2200);
    } catch {
      this.error.set('No se pudo copiar el enlace.');
    }
  }

  compartir(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const datos = { title: this.titulo, text: this.descripcion, url: this.urlPublica };

    if (navigator.share) {
      void navigator.share(datos).catch(() => undefined);
      return;
    }

    void this.copiarEnlace();
  }

  whatsapp(): string {
    const texto = encodeURIComponent(`${this.titulo} — ${this.empresaActiva?.nombre ?? ''}\n${this.urlPublica}`);
    return `https://wa.me/?text=${texto}`;
  }

  iniciales(nombre: string | null | undefined): string {
    const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return 'E';
    return partes.length === 1
      ? partes[0].slice(0, 2).toUpperCase()
      : (partes[0][0] + partes[1][0]).toUpperCase();
  }
}
