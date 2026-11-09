import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  ComponenteLienzo,
  DisenoGuardadoCarpeta,
  DisenoLienzo,
  EmpresaPublica,
  TipoComponente,
} from '../../../core/models/empresa.model';
import { EmpresaService, mensajeDeError } from '../../../core/services/empresa.service';
import { leerJson } from '../empresa-ui';
import { EmpresaComponenteVistaComponent } from '../componente-vista/empresa-componente-vista.component';

type Filtro = 'TODAS' | 'MENU' | 'TARJETA' | 'HTML' | 'OTRAS';

interface DisenoCarpeta extends DisenoGuardadoCarpeta {
  titulo: string;
  resumen: string;
  imagen: string | null;
}

/**
 * Carpeta de diseños: todos los componentes que creaste (menús, tarjetas, información,
 * HTML interactivo), cada uno con su propio enlace como en las vCards.
 * Se abre en /app/empresa/disenos desde el panel y en /empresa/{slug}/componentes en público.
 */
@Component({
  selector: 'app-empresa-componentes',
  standalone: true,
  imports: [CommonModule, RouterLink, EmpresaComponenteVistaComponent],
  templateUrl: './empresa-componentes.component.html',
  styleUrls: ['./empresa-componentes.component.scss'],
})
export class EmpresaComponentesComponent implements OnInit {
  private servicio = inject(EmpresaService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly disenos = signal<DisenoCarpeta[]>([]);
  /** Diseños con nombre de la empresa activa (menú, tarjeta, catálogo...). */
  readonly lienzos = signal<DisenoLienzo[]>([]);
  readonly empresaActivaId = signal<string | null>(null);
  /** Datos de la empresa cuando la carpeta se abre en su enlace público. */
  readonly publicaSignal = signal<EmpresaPublica | null>(null);
  readonly creando = signal(false);
  readonly ocupado = signal<string | null>(null);
  readonly nombreNuevo = signal('');
  escribirNombre(valor: string): void {
    this.nombreNuevo.set(valor ?? '');
  }
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly filtro = signal<Filtro>('TODAS');
  readonly busqueda = signal('');
  readonly aviso = signal<string | null>(null);

  /** true cuando la carpeta se abre desde el enlace público de la empresa. */
  readonly modoPublico = signal<boolean | null>(null);
  readonly slug = signal<string | null>(null);
  readonly nombreEmpresa = signal<string | null>(null);

  readonly filtros: { valor: Filtro; etiqueta: string; icono: string }[] = [
    { valor: 'TODAS', etiqueta: 'Todas', icono: 'fa-solid fa-layer-group' },
    { valor: 'MENU', etiqueta: 'Menús', icono: 'fa-solid fa-book-open' },
    { valor: 'TARJETA', etiqueta: 'Tarjetas', icono: 'fa-solid fa-id-card' },
    { valor: 'HTML', etiqueta: 'Interactivas', icono: 'fa-solid fa-code' },
    { valor: 'OTRAS', etiqueta: 'Otras', icono: 'fa-solid fa-shapes' },
  ];

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    const esPublico = Boolean(slug) && Boolean(this.route.snapshot.routeConfig?.path?.startsWith('empresa/:slug'));

    this.slug.set(slug);
    this.modoPublico.set(esPublico);

    if (esPublico) this.cargarPublico(slug as string);
    else this.cargarMisDisenos();
  }

  readonly visibles = computed<DisenoCarpeta[]>(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const filtro = this.filtro();

    return this.disenos()
      .filter((diseno) => diseno.tipo !== 'SEPARADOR')
      .filter((diseno) => (filtro === 'TODAS' ? true : this.grupoDe(diseno.tipo) === filtro))
      .filter((diseno) =>
        texto ? `${diseno.titulo} ${diseno.resumen} ${diseno.empresaNombre}`.toLowerCase().includes(texto) : true,
      )
      .sort((a, b) => (b.actualizadaEn ?? '').localeCompare(a.actualizadaEn ?? ''));
  });

  /** Lienzos públicos de la empresa (vista compartible). */
  get publicos(): DisenoLienzo[] {
    return (this.publicaSignal()?.disenos ?? []).filter((diseno: DisenoLienzo) => diseno.publico !== false);
  }

  get urlPerfil(): string {
    const slug = this.slug();
    return slug ? `/empresa/${slug}` : '/app/empresa';
  }

  get urlLienzo(): string {
    return '/app/empresa/lienzo';
  }

  /** Abre un diseño de la carpeta directamente sobre su lienzo. */
  editar(diseno: DisenoCarpeta): void {
    const destino = diseno.disenoId ?? this.disenoDe(diseno);

    void this.router.navigate(['/app/empresa/lienzo'], {
      queryParams: destino ? { diseno: destino } : {},
    });
  }

  /** Un diseño de la lista (menú «Tus lienzos»): abre ese diseño en el lienzo, no uno nuevo. */
  editarLienzo(diseno: DisenoLienzo): void {
    this.editarDiseno(diseno);
  }

  /** Busca el diseño al que pertenece una pieza, por su id. */
  private disenoDe(diseno: DisenoCarpeta): string | null {
    if (diseno.disenoId) return diseno.disenoId;
    const match = this.lienzos().find((item) => item.slug && diseno.enlace.includes(item.slug));
    return match?.id ?? null;
  }

  get tituloPagina(): string {
    return this.modoPublico() ? `Componentes de ${this.nombreEmpresa() ?? 'la empresa'}` : 'Mis diseños';
  }

  get subtitulo(): string {
    return this.modoPublico()
      ? 'Menús, tarjetas e información publicados, cada uno con su propio enlace.'
      : 'Cada lienzo guarda sus propias piezas: un menú, una tarjeta, un catálogo. Aquí los abres, los compartes o los borras.';
  }

  cambiarFiltro(valor: Filtro): void {
    this.filtro.set(valor);
  }

  buscar(valor: string): void {
    this.busqueda.set(valor);
  }

  abrir(diseno: DisenoCarpeta): void {
    if (!diseno.enlace) return;
    void this.router.navigateByUrl(diseno.enlace);
  }

  copiarEnlace(diseno: DisenoCarpeta): void {
    if (typeof window === 'undefined' || !navigator.clipboard?.writeText) {
      this.error.set('Tu navegador no deja copiar. Abre el diseño y copia la dirección.');
      return;
    }

    const url = `${window.location.origin}${diseno.enlace}`;
    void navigator.clipboard
      .writeText(url)
      .then(() => this.avisar(`Enlace copiado: ${diseno.enlace}`))
      .catch(() => this.error.set('No se pudo copiar el enlace.'));
  }

  etiqueta(tipo: TipoComponente): string {
    switch (tipo) {
      case 'MENU':
        return 'Menú';
      case 'BOTON':
      case 'CONTACTO':
      case 'PRODUCTO':
        return 'Tarjeta';
      case 'HTML':
        return 'Interactiva';
      case 'TEXTO':
        return 'Información';
      case 'LISTA':
        return 'Lista';
      case 'GALERIA':
        return 'Galería';
      case 'HORARIO':
        return 'Horario';
      case 'IMAGEN':
        return 'Imagen';
      default:
        return 'Diseño';
    }
  }

  icono(tipo: TipoComponente): string {
    switch (tipo) {
      case 'MENU':
        return 'fa-solid fa-book-open';
      case 'BOTON':
      case 'CONTACTO':
      case 'PRODUCTO':
        return 'fa-solid fa-id-card';
      case 'HTML':
        return 'fa-solid fa-code';
      case 'TEXTO':
        return 'fa-solid fa-font';
      case 'LISTA':
        return 'fa-solid fa-list';
      case 'GALERIA':
        return 'fa-solid fa-images';
      case 'HORARIO':
        return 'fa-solid fa-clock';
      case 'IMAGEN':
        return 'fa-solid fa-image';
      default:
        return 'fa-solid fa-shapes';
    }
  }

  private avisar(mensaje: string): void {
    this.aviso.set(mensaje);
    setTimeout(() => this.aviso.set(null), 2600);
  }

  private grupoDe(tipo: TipoComponente): Filtro {
    if (tipo === 'MENU') return 'MENU';
    if (tipo === 'BOTON' || tipo === 'CONTACTO' || tipo === 'PRODUCTO') return 'TARJETA';
    if (tipo === 'HTML') return 'HTML';
    return 'OTRAS';
  }

  private aDiseno(guardado: DisenoGuardadoCarpeta): DisenoCarpeta {
    const contenido = leerJson<any>(guardado.contenido, {});

    const titulo = String(
      contenido?.titulo ?? contenido?.nombre ?? guardado.nombre ?? this.etiqueta(guardado.tipo),
    );

    const resumen = String(contenido?.texto ?? contenido?.descripcion ?? this.resumenDe(guardado, contenido));

    const imagen =
      contenido?.url ??
      contenido?.imagen ??
      (Array.isArray(contenido?.imagenes) ? contenido.imagenes[0] : null) ??
      null;

    return {
      ...guardado,
      titulo,
      resumen: resumen.slice(0, 110),
      imagen: typeof imagen === 'string' && imagen ? imagen : null,
    };
  }

  private resumenDe(guardado: DisenoGuardadoCarpeta, contenido: any): string {
    switch (guardado.tipo) {
      case 'MENU': {
        const grupos = Array.isArray(contenido?.grupos) ? contenido.grupos : [];
        const platos = grupos.reduce((total: number, grupo: any) => total + (grupo?.items?.length ?? 0), 0);
        return `${grupos.length} secciones · ${platos} platos`;
      }
      case 'LISTA':
        return `${(contenido?.items ?? []).length} elementos`;
      case 'GALERIA':
        return `${(contenido?.imagenes ?? []).length} imágenes`;
      case 'HORARIO':
        return `${(contenido?.filas ?? []).length} franjas de atención`;
      case 'HTML':
        return 'Contenido interactivo con su propio diseño';
      case 'CONTACTO':
        return [contenido?.telefono, contenido?.correo].filter(Boolean).join(' · ');
      default:
        return '';
    }
  }

  private cargarMisDisenos(): void {
    this.cargando.set(true);

    this.servicio.cargarMis().subscribe((mias) => {
      const activa = this.servicio.activaId() ?? mias[0]?.id ?? null;
      this.empresaActivaId.set(activa);

      if (activa) {
        this.servicio.listarDisenos(activa).subscribe((lista) => this.lienzos.set(lista));
      }

      this.servicio.misDisenos().subscribe(() => {
        // Las piezas sueltas ya no se listan aquí: cada una pertenece a su lienzo.
        this.cargando.set(false);
        this.disenos.set([]);
      });
    });
  }

  // ---- Diseños con nombre: crear, editar, borrar y público/privado ----

  empezarDiseno(): void {
    this.creando.set(true);
    this.nombreNuevo.set('');
  }

  cancelarDiseno(): void {
    this.creando.set(false);
    this.nombreNuevo.set('');
  }

  crearDiseno(): void {
    const empresaId = this.empresaActivaId();
    if (!empresaId || this.ocupado()) return;

    const nombre = this.nombreNuevo().trim() || 'Diseño sin título';
    this.ocupado.set('nuevo');

    this.servicio.crearDiseno(empresaId, { nombre }).subscribe({
      next: (diseno) => {
        this.ocupado.set(null);
        this.creando.set(false);
        this.lienzos.update((lista) => [diseno, ...lista]);
        this.editarDiseno(diseno);
      },
      error: (err) => {
        this.ocupado.set(null);
        this.error.set(mensajeDeError(err, 'No se pudo crear el diseño.'));
      },
    });
  }

  editarDiseno(diseno: DisenoLienzo): void {
    void this.router.navigate(['/app/empresa/lienzo'], { queryParams: { diseno: diseno.id } });
  }

  borrarDiseno(diseno: DisenoLienzo): void {
    const empresaId = diseno.empresaId || this.empresaActivaId();
    if (!empresaId || this.ocupado()) return;

    const seguro = typeof window === 'undefined' ? true : window.confirm(`¿Borrar el diseño «${diseno.nombre}» y todas sus piezas?`);
    if (!seguro) return;

    this.ocupado.set(diseno.id);

    this.servicio.borrarDiseno(empresaId, diseno.id).subscribe({
      next: () => {
        this.ocupado.set(null);
        this.lienzos.update((lista) => lista.filter((item) => item.id !== diseno.id));
        this.avisar(`Diseño «${diseno.nombre}» borrado.`);
      },
      error: (err) => {
        this.ocupado.set(null);
        this.error.set(mensajeDeError(err, 'No se pudo borrar el diseño.'));
      },
    });
  }

  alternarPublico(diseno: DisenoLienzo): void {
    const empresaId = diseno.empresaId || this.empresaActivaId();
    if (!empresaId || this.ocupado()) return;

    const nuevo = !diseno.publico;
    this.ocupado.set(diseno.id);

    this.servicio.publicarDiseno(empresaId, diseno.id, nuevo).subscribe({
      next: (actualizado) => {
        this.ocupado.set(null);
        this.lienzos.update((lista) => lista.map((item) => (item.id === diseno.id ? actualizado : item)));
        this.avisar(nuevo ? `«${diseno.nombre}» ahora es público.` : `«${diseno.nombre}» ahora es privado.`);
      },
      error: (err) => {
        this.ocupado.set(null);
        this.error.set(mensajeDeError(err, 'No se pudo cambiar la visibilidad.'));
      },
    });
  }

  enlaceDiseno(diseno: DisenoLienzo): string {
    if (typeof window === 'undefined') return diseno.enlace;
    return `${window.location.origin}${diseno.enlace}`;
  }

  copiarDiseno(diseno: DisenoLienzo): void {
    if (typeof window === 'undefined' || !navigator.clipboard?.writeText) return;
    void navigator.clipboard.writeText(this.enlaceDiseno(diseno)).then(
      () => this.avisar('Enlace del diseño copiado.'),
      () => this.error.set('No se pudo copiar el enlace.'),
    );
  }

  private cargarPublico(slug: string): void {
    this.cargando.set(true);

    this.servicio.cargarPublica(slug).subscribe((datos) => {
      this.cargando.set(false);

      if (!datos) {
        this.error.set('Esta empresa todavía no publicó su entorno.');
        return;
      }

      this.nombreEmpresa.set(datos.empresa.nombre);
      this.publicaSignal.set(datos);
      this.lienzos.set(datos.disenos ?? []);
    });
  }

}
