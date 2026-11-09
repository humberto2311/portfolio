import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import {
  ActualizarMiembro,
  DisenoEmpresa,
  DocumentoEmpresa,
  DocumentoEmpresaForm,
  Empresa,
  EmpresaForm,
  MiembroEmpresa,
  PanelEmpresa,
  RolEmpresa,
  TipoEmpresa,
} from '../../../core/models/empresa.model';
import { EmpresaService, mensajeDeError } from '../../../core/services/empresa.service';
import { DisenoService } from '../../../core/services/diseno.service';
import {
  PALETA_MARCA,
  ROLES_INFO,
  documentosExigidos,
  etiquetaOpcion,
  leerImagen,
  origenPublico,
  slugificar,
} from '../empresa-ui';

type TabAjustes = 'perfil' | 'equipo' | 'documentos' | 'publicacion' | 'marca';

const TABS: { id: TabAjustes; titulo: string; icono: string }[] = [
  { id: 'perfil', titulo: 'Perfil', icono: 'fa-solid fa-address-card' },
  { id: 'equipo', titulo: 'Equipo', icono: 'fa-solid fa-users' },
  { id: 'documentos', titulo: 'Documentos', icono: 'fa-solid fa-file-shield' },
  { id: 'publicacion', titulo: 'Publicación', icono: 'fa-solid fa-globe' },
  { id: 'marca', titulo: 'Marca', icono: 'fa-solid fa-palette' },
];

const DOCUMENTO_VACIO: DocumentoEmpresaForm = {
  id: null,
  tipo: '',
  numero: '',
  url: '',
  descripcion: '',
  expedidoEn: '',
  venceEn: '',
};

@Component({
  selector: 'app-empresa-ajustes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './empresa-ajustes.component.html',
  styleUrls: ['./empresa-ajustes.component.scss'],
})
export class EmpresaAjustesComponent implements OnInit, OnDestroy {
  private empresa = inject(EmpresaService);
  private diseno = inject(DisenoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);

  @ViewChild('tabsNav') tabsNav?: ElementRef<HTMLElement>;

  readonly panel = this.empresa.panel;
  readonly catalogo = this.empresa.catalogo;
  readonly tabs = TABS;

  readonly tab = signal<TabAjustes>('perfil');
  readonly cargando = signal(true);
  readonly guardandoPerfil = signal(false);
  readonly guardandoMarca = signal(false);
  readonly publicando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  readonly confirmandoBorrado = signal(false);

  readonly paleta = PALETA_MARCA;

  perfil: EmpresaForm = {};
  perfilSlug = '';
  slugEstado: 'inactivo' | 'revisando' | 'libre' | 'ocupado' = 'inactivo';
  tipoSeleccionado: TipoEmpresa | null = null;

  invitarCorreo = '';
  invitarRol: RolEmpresa = 'LECTOR';
  invitarPuesto = '';
  invitando = false;
  confirmarMiembro: string | null = null;

  documento: DocumentoEmpresaForm = { ...DOCUMENTO_VACIO };
  subiendoDocumento = false;
  confirmarDocumento: string | null = null;

  disenoAcento = '#2563eb';
  disenoSecundario = '#0ea5e9';
  disenoFondo = '';
  disenoCss = '';
  erroresDiseno: string[] = [];

  private perfilBase: EmpresaForm = {};
  private slugBase = '';
  private tipoBase: TipoEmpresa | null = null;
  private slugAuto = '';
  private perfilFotoBase = '';
  private marcaBase: DisenoEmpresa | null = null;
  private marcaFotoBase = '';
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const inicial = params.get('tab') as TabAjustes | null;
        if (inicial && TABS.some((t) => t.id === inicial)) this.tab.set(inicial);
      });

    this.empresa.cargarCatalogo().subscribe();
    this.empresa.cargarMis().subscribe((mias) => {
      if (!mias.length) {
        this.cargando.set(false);
        return;
      }

      const activa = this.empresa.activaId() ?? mias[0].id;
      if (!this.empresa.activaId()) this.empresa.entrar(activa);

      const cache = this.panel();
      if (cache?.empresa.id === activa) {
        this.aplicarPanel(cache);
        this.cargando.set(false);
        this.sincronizar(activa);
        return;
      }

      this.cargar(activa);
    });
  }

  ngOnDestroy(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.diseno.limpiarAjeno();
  }

  get actual(): Empresa | null {
    return this.panel()?.empresa ?? this.empresa.empresaActual();
  }

  get acceso() {
    return this.panel()?.acceso ?? null;
  }

  get miembros(): MiembroEmpresa[] {
    return this.panel()?.miembros ?? [];
  }

  get documentos(): DocumentoEmpresa[] {
    return this.panel()?.documentos ?? [];
  }

  get esPersonal(): boolean {
    return this.actual?.tipo === 'PERSONAL';
  }

  get exigidos(): string[] {
    return documentosExigidos(this.actual?.tipo, this.actual?.sector);
  }

  get faltantes(): string[] {
    return this.actual?.documentosFaltantes ?? [];
  }

  get urlPublica(): string {
    const slug = this.actual?.slug;
    return slug ? `${origenPublico()}/${slug}` : origenPublico();
  }

  get puedeEditarPerfil(): boolean {
    return Boolean(this.acceso?.editaPerfil);
  }

  get puedeGestionarEquipo(): boolean {
    return Boolean(this.acceso?.gestionaEquipo);
  }

  get puedeGestionarDocumentos(): boolean {
    return Boolean(this.acceso?.gestionaDocumentos);
  }

  get puedePublicar(): boolean {
    return Boolean(this.acceso?.publica);
  }

  get puedeEditarMarca(): boolean {
    return Boolean(this.acceso?.editaLienzo);
  }

  get perfilSucio(): boolean {
    return this.fotoPerfil() !== this.perfilFotoBase;
  }

  get marcaSucia(): boolean {
    return this.fotoMarca() !== this.marcaFotoBase;
  }

  get tiposDocumento(): { valor: string; etiqueta: string; exigido: boolean }[] {
    const catalogo = this.catalogo()?.documentos ?? [];
    return catalogo.map((opcion) => ({
      valor: opcion.valor,
      etiqueta: opcion.etiqueta,
      exigido: this.exigidos.includes(opcion.valor),
    }));
  }

  get rolOpciones(): { valor: RolEmpresa; etiqueta: string }[] {
    return (this.catalogo()?.roles ?? []).map((opcion) => ({
      valor: opcion.valor as RolEmpresa,
      etiqueta: opcion.etiqueta,
    }));
  }

  pendiente(id: TabAjustes): boolean {
    if (id === 'perfil') return this.perfilSucio;
    if (id === 'marca') return this.marcaSucia;
    return false;
  }

  cambiarTab(tab: TabAjustes): void {
    if (this.tab() === tab) return;

    this.tab.set(tab);
    this.error.set(null);
    this.aviso.set(null);
    this.confirmarMiembro = null;
    this.confirmarDocumento = null;
    this.confirmandoBorrado.set(false);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    if (isPlatformBrowser(this.platformId)) {
      this.tabsNav?.nativeElement.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }

  rolDescripcion(rol: RolEmpresa): string {
    return ROLES_INFO[rol]?.descripcion ?? '';
  }

  descripcionRol(valor: string): string {
    return this.rolDescripcion(valor as RolEmpresa);
  }

  etiquetaDocumento(valor: string | null | undefined): string {
    return etiquetaOpcion(this.catalogo(), 'documentos', valor);
  }

  etiquetaRol(valor: string | null | undefined): string {
    return etiquetaOpcion(this.catalogo(), 'roles', valor);
  }

  tipoDe(valor: string | null | undefined): string {
    return etiquetaOpcion(this.catalogo(), 'tipos', valor);
  }

  sectorDe(valor: string | null | undefined): string {
    return etiquetaOpcion(this.catalogo(), 'sectores', valor);
  }

  cambiarNombre(valor: string): void {
    this.perfil.nombre = valor;

    if (this.slugEstado !== 'ocupado' && this.perfilSlug === this.slugAuto) {
      this.perfilSlug = slugificar(valor);
      this.slugAuto = this.perfilSlug;
      this.programarSlug();
    }
  }

  cambiarSlug(valor: string): void {
    this.perfilSlug = slugificar(valor);
    this.slugAuto = '';
    this.slugEstado = 'inactivo';
    this.programarSlug();
  }

  revisarSlug(): void {
    const slug = this.perfilSlug.trim();
    if (!slug || slug === this.actual?.slug) {
      this.slugEstado = 'inactivo';
      return;
    }

    this.slugEstado = 'revisando';
    this.empresa.slugLibre(slug).subscribe((libre) => {
      this.slugEstado = libre ? 'libre' : 'ocupado';
    });
  }

  logoDesdeArchivo(input: HTMLInputElement): void {
    this.cargarImagen(input, (url) => (this.perfil.logoUrl = url));
  }

  portadaDesdeArchivo(input: HTMLInputElement): void {
    this.cargarImagen(input, (url) => (this.perfil.portadaUrl = url));
  }

  quitarLogo(): void {
    this.perfil.logoUrl = null;
  }

  quitarPortada(): void {
    this.perfil.portadaUrl = null;
  }

  descartarPerfil(): void {
    this.perfil = { ...this.perfilBase };
    this.perfilSlug = this.slugBase;
    this.tipoSeleccionado = this.tipoBase;
    this.slugAuto = this.slugBase;
    this.slugEstado = 'inactivo';
    this.error.set(null);
    this.aviso.set(null);
  }

  guardarPerfil(): void {
    const empresa = this.actual;
    if (!empresa || !this.puedeEditarPerfil || !this.perfilSucio) return;

    if (!this.perfil.nombre || this.perfil.nombre.trim().length < 2) {
      this.error.set('El nombre de la empresa necesita al menos dos letras.');
      return;
    }

    if (this.slugEstado === 'ocupado') {
      this.error.set('Ese enlace ya lo usa otra empresa. Elige otro.');
      return;
    }

    const form: EmpresaForm = {
      ...this.perfil,
      tipo: this.tipoSeleccionado ?? empresa.tipo,
      slug: this.perfilSlug.trim() || null,
    };

    this.guardandoPerfil.set(true);
    this.error.set(null);
    this.aviso.set(null);

    this.empresa
      .actualizar(empresa.id, form)
      .pipe(finalize(() => this.guardandoPerfil.set(false)))
      .subscribe({
        next: (actualizada) => {
          this.empresa.parchearEmpresa(actualizada);
          this.aplicarPerfil(actualizada);
          this.aviso.set('Perfil empresarial actualizado.');
        },
        error: (err) => this.error.set(mensajeDeError(err, 'No se pudo guardar el perfil.')),
      });
  }

  invitar(): void {
    const empresa = this.actual;
    if (!empresa || !this.puedeGestionarEquipo) return;

    if (!this.invitarCorreo.trim()) {
      this.error.set('Escribe el correo de la persona que quieres añadir.');
      return;
    }

    this.invitando = true;
    this.error.set(null);

    this.empresa
      .invitar(empresa.id, {
        correo: this.invitarCorreo.trim(),
        rol: this.invitarRol,
        puesto: this.invitarPuesto.trim() || null,
      })
      .pipe(finalize(() => (this.invitando = false)))
      .subscribe({
        next: (miembro) => {
          this.aplicarMiembro(miembro);
          this.aviso.set(`${miembro.nombre} ya hace parte del equipo.`);
          this.invitarCorreo = '';
          this.invitarPuesto = '';
        },
        error: (err) => this.error.set(mensajeDeError(err, 'No se pudo añadir a esa persona.')),
      });
  }

  cambiarRolMiembro(miembro: MiembroEmpresa, rol: string): void {
    const empresa = this.actual;
    if (!empresa || !this.puedeGestionarEquipo || miembro.rol === rol) return;

    this.empresa.cambiarRol(empresa.id, miembro.id, { rol }).subscribe({
      next: (actualizado) => {
        this.aplicarMiembro(actualizado);
        if (actualizado.propio) this.sincronizar(empresa.id);
      },
      error: (err) => this.error.set(mensajeDeError(err, 'No se pudo cambiar el rol.')),
    });
  }

  cambiarPuesto(miembro: MiembroEmpresa, puesto: string): void {
    const empresa = this.actual;
    if (!empresa || !this.puedeGestionarEquipo) return;
    if ((miembro.puesto ?? '') === puesto) return;

    this.empresa.cambiarRol(empresa.id, miembro.id, { puesto }).subscribe({
      next: (actualizado) => this.aplicarMiembro(actualizado),
      error: (err) => this.error.set(mensajeDeError(err, 'No se pudo cambiar el puesto.')),
    });
  }

  alternarVisible(miembro: MiembroEmpresa): void {
    const empresa = this.actual;
    if (!empresa || !this.puedeGestionarEquipo) return;

    this.empresa
      .cambiarRol(empresa.id, miembro.id, { visibleEnEquipo: !miembro.visibleEnEquipo })
      .subscribe({
        next: (actualizado) => this.aplicarMiembro(actualizado),
        error: (err) => this.error.set(mensajeDeError(err, 'No se pudo cambiar la visibilidad.')),
      });
  }

  pedirQuitar(miembro: MiembroEmpresa): void {
    if (this.confirmarMiembro === miembro.id) {
      this.quitarMiembro(miembro);
      return;
    }
    this.confirmarMiembro = miembro.id;
  }

  quitarMiembro(miembro: MiembroEmpresa): void {
    const empresa = this.actual;
    if (!empresa) return;

    this.confirmarMiembro = null;
    this.empresa.quitar(empresa.id, miembro.id).subscribe({
      next: () => {
        this.empresa.parchearPanel({
          miembros: this.miembros.filter((item) => item.id !== miembro.id),
        });
        this.aviso.set(`${miembro.nombre} ya no hace parte del equipo.`);
        if (miembro.propio) this.empresa.salir();
      },
      error: (err) => this.error.set(mensajeDeError(err, 'No se pudo quitar a esa persona.')),
    });
  }

  cambiarTipoDocumento(tipo: string): void {
    const existente = this.documentos.find((item) => item.tipo === tipo);

    if (existente) {
      this.documento = {
        id: existente.id,
        tipo: existente.tipo,
        numero: existente.numero ?? '',
        url: existente.url,
        descripcion: existente.descripcion ?? '',
        expedidoEn: existente.expedidoEn ?? '',
        venceEn: existente.venceEn ?? '',
      };
      return;
    }

    this.documento = { ...DOCUMENTO_VACIO, tipo };
  }

  documentoDesdeArchivo(input: HTMLInputElement): void {
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;

    leerImagen(archivo, 1_900_000).then(
      (url) => {
        this.documento.url = url;
        this.error.set(null);
      },
      (error: Error) => this.error.set(error.message),
    );
  }

  enviarDocumento(): void {
    const empresa = this.actual;
    if (!empresa || !this.puedeGestionarDocumentos) return;

    if (!this.documento.tipo) {
      this.error.set('Elige qué documento vas a cargar.');
      return;
    }
    if (!this.documento.url) {
      this.error.set('Adjunta una foto o imagen del documento.');
      return;
    }

    this.subiendoDocumento = true;
    this.error.set(null);

    this.empresa
      .subirDocumento(empresa.id, {
        ...this.documento,
        numero: this.documento.numero?.trim() || null,
        descripcion: this.documento.descripcion?.trim() || null,
        expedidoEn: this.documento.expedidoEn || null,
        venceEn: this.documento.venceEn || null,
      })
      .pipe(finalize(() => (this.subiendoDocumento = false)))
      .subscribe({
        next: (documento) => {
          this.empresa.parchearPanel({
            documentos: [
              ...this.documentos.filter((item) => item.tipo !== documento.tipo),
              documento,
            ],
          });

          if (documento.estado === 'VALIDADO') {
            this.aviso.set(`${this.etiquetaDocumento(documento.tipo)} validado.`);
          } else {
            this.error.set(documento.motivoRechazo || 'El documento fue rechazado.');
          }

          this.documento = { ...DOCUMENTO_VACIO };
          this.sincronizar(empresa.id);
        },
        error: (err) => this.error.set(mensajeDeError(err, 'No se pudo cargar el documento.')),
      });
  }

  pedirBorrarDocumento(documento: DocumentoEmpresa): void {
    if (this.confirmarDocumento === documento.id) {
      this.borrarDocumento(documento);
      return;
    }
    this.confirmarDocumento = documento.id;
  }

  borrarDocumento(documento: DocumentoEmpresa): void {
    const empresa = this.actual;
    if (!empresa) return;

    this.confirmarDocumento = null;
    this.empresa.borrarDocumento(empresa.id, documento.id).subscribe({
      next: () => {
        this.empresa.parchearPanel({
          documentos: this.documentos.filter((item) => item.id !== documento.id),
        });
        this.aviso.set('Documento eliminado.');
        this.sincronizar(empresa.id);
      },
      error: (err) => this.error.set(mensajeDeError(err, 'No se pudo eliminar el documento.')),
    });
  }

  alternarPublicacion(): void {
    const empresa = this.actual;
    if (!empresa || !this.puedePublicar) return;

    const publicada = !empresa.publicada;
    this.publicando.set(true);
    this.error.set(null);
    this.aviso.set(null);

    this.empresa
      .publicar(empresa.id, publicada)
      .pipe(finalize(() => this.publicando.set(false)))
      .subscribe({
        next: (actualizada) => {
          this.empresa.parchearEmpresa(actualizada);
          this.aviso.set(
            publicada ? 'La empresa ya tiene su página pública.' : 'La página pública se ocultó.',
          );
        },
        error: (err) => this.error.set(mensajeDeError(err, 'No se pudo cambiar la publicación.')),
      });
  }

  copiarEnlace(): void {
    const url = this.urlPublica;
    if (isPlatformBrowser(this.platformId) && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(
        () => this.aviso.set('Enlace copiado.'),
        () => this.aviso.set(url),
      );
      return;
    }
    this.aviso.set(url);
  }

  abrirPublica(): void {
    const slug = this.actual?.slug;
    if (slug) this.router.navigate(['/empresa', slug]);
  }

  elegirAcento(color: string): void {
    this.disenoAcento = color;
    this.previsualizarMarca();
  }

  elegirSecundario(color: string): void {
    this.disenoSecundario = color;
    this.previsualizarMarca();
  }

  cambiarCssMarca(valor: string): void {
    this.disenoCss = valor;
    this.previsualizarMarca();
  }

  fondoDesdeArchivo(input: HTMLInputElement): void {
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;

    leerImagen(archivo, 1_900_000).then(
      (url) => {
        this.disenoFondo = url;
        this.erroresDiseno = [];
        this.previsualizarMarca();
      },
      (error: Error) => (this.erroresDiseno = [error.message]),
    );
  }

  quitarFondo(): void {
    this.disenoFondo = '';
    this.previsualizarMarca();
  }

  descartarMarca(): void {
    if (!this.marcaBase) return;
    this.aplicarMarca(this.marcaBase);
    this.erroresDiseno = [];
    this.error.set(null);
    this.aviso.set(null);
  }

  guardarMarca(): void {
    const empresa = this.actual;
    if (!empresa || !this.puedeEditarMarca || !this.marcaSucia) return;

    this.guardandoMarca.set(true);
    this.erroresDiseno = [];
    this.aviso.set(null);

    this.empresa
      .guardarDiseno(empresa.id, {
        acento: this.disenoAcento || null,
        secundario: this.disenoSecundario || null,
        fondoUrl: this.disenoFondo || null,
        css: this.disenoCss || null,
        activo: true,
      })
      .pipe(finalize(() => this.guardandoMarca.set(false)))
      .subscribe({
        next: (diseno) => {
          if (diseno.errores?.length) {
            this.erroresDiseno = diseno.errores;
            return;
          }

          this.empresa.parchearPanel({ diseno });
          this.aplicarMarca(diseno);
          this.aviso.set('Identidad de marca guardada.');
        },
        error: (err) => (this.erroresDiseno = [mensajeDeError(err, 'No se pudo guardar la marca.')]),
      });
  }

  pedirBorrarEmpresa(): void {
    if (this.confirmandoBorrado()) {
      this.borrarEmpresa();
      return;
    }
    this.confirmandoBorrado.set(true);
  }

  cancelarBorrado(): void {
    this.confirmandoBorrado.set(false);
  }

  borrarEmpresa(): void {
    const empresa = this.actual;
    if (!empresa || this.acceso?.rol !== 'ADMIN') return;

    this.confirmandoBorrado.set(false);
    this.empresa.borrar(empresa.id).subscribe({
      next: () => {
        this.router.navigate(['/app/ajustes/cuenta'], { queryParams: { tab: 'empresas' } });
      },
      error: (err) => this.error.set(mensajeDeError(err, 'No se pudo borrar la empresa.')),
    });
  }

  private cargar(id: string): void {
    this.cargando.set(true);
    this.error.set(null);

    this.empresa.cargarPanel(id).subscribe((panel) => {
      this.cargando.set(false);

      if (!panel) {
        this.error.set('No se pudo cargar la empresa. Revisa tu conexión o tus permisos.');
        return;
      }

      this.aplicarPanel(panel);
    });
  }

  private sincronizar(id: string): void {
    this.empresa.cargarPanel(id).subscribe((panel) => {
      if (!panel) return;
      if (!this.perfilSucio) this.aplicarPerfil(panel.empresa);
      if (!this.marcaSucia) this.aplicarMarca(panel.diseno);
    });
  }

  private aplicarPanel(panel: PanelEmpresa): void {
    this.aplicarPerfil(panel.empresa);
    this.aplicarMarca(panel.diseno);
  }

  private aplicarPerfil(empresa: Empresa): void {
    this.perfil = {
      nombre: empresa.nombre,
      razonSocial: empresa.razonSocial ?? '',
      slug: empresa.slug,
      nit: empresa.nit ?? '',
      tipo: empresa.tipo,
      sector: empresa.sector ?? '',
      eslogan: empresa.eslogan ?? '',
      descripcion: empresa.descripcion ?? '',
      direccion: empresa.direccion ?? '',
      ciudad: empresa.ciudad ?? '',
      departamento: empresa.departamento ?? '',
      telefono: empresa.telefono ?? '',
      whatsapp: empresa.whatsapp ?? '',
      correo: empresa.correo ?? '',
      sitioWeb: empresa.sitioWeb ?? '',
      instagramUrl: empresa.instagramUrl ?? '',
      facebookUrl: empresa.facebookUrl ?? '',
      tiktokUrl: empresa.tiktokUrl ?? '',
      horario: empresa.horario ?? '',
      logoUrl: empresa.logoUrl ?? null,
      portadaUrl: empresa.portadaUrl ?? null,
    };

    this.perfilBase = { ...this.perfil };
    this.perfilSlug = empresa.slug;
    this.slugBase = empresa.slug;
    this.slugAuto = empresa.slug;
    this.tipoSeleccionado = empresa.tipo;
    this.tipoBase = empresa.tipo;
    this.slugEstado = 'inactivo';
    this.perfilFotoBase = this.fotoPerfil();
  }

  private aplicarMarca(diseno: DisenoEmpresa): void {
    this.marcaBase = diseno;
    this.disenoAcento = diseno.acento ?? '#2563eb';
    this.disenoSecundario = diseno.secundario ?? '#0ea5e9';
    this.disenoFondo = diseno.fondoUrl ?? '';
    this.disenoCss = diseno.css ?? '';
    this.marcaFotoBase = this.fotoMarca();

    this.diseno.aplicarAjeno({
      acento: diseno.acento ?? null,
      secundario: diseno.secundario ?? null,
      fondoUrl: diseno.fondoUrl ?? null,
      css: diseno.css ?? null,
      activo: diseno.activo,
    });
  }

  private previsualizarMarca(): void {
    if (!this.marcaSucia) return;

    this.diseno.aplicarAjeno({
      acento: this.disenoAcento || null,
      secundario: this.disenoSecundario || null,
      fondoUrl: this.disenoFondo || null,
      css: this.disenoCss || null,
      activo: true,
    });
  }

  private aplicarMiembro(miembro: MiembroEmpresa): void {
    const lista = this.miembros;
    this.empresa.parchearPanel({
      miembros: lista.some((item) => item.id === miembro.id)
        ? lista.map((item) => (item.id === miembro.id ? miembro : item))
        : [...lista, miembro],
    });
  }

  private fotoPerfil(): string {
    const datos: Record<string, unknown> = {
      ...this.perfil,
      tipo: this.tipoSeleccionado,
      slug: this.perfilSlug.trim(),
    };

    return JSON.stringify(
      Object.keys(datos)
        .sort()
        .map((clave) => [clave, datos[clave] ?? null]),
    );
  }

  private fotoMarca(): string {
    return JSON.stringify([
      this.disenoAcento,
      this.disenoSecundario,
      this.disenoFondo,
      this.disenoCss,
    ]);
  }

  private cargarImagen(input: HTMLInputElement, asignar: (url: string) => void): void {
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;

    leerImagen(archivo).then(
      (url) => {
        this.error.set(null);
        asignar(url);
      },
      (error: Error) => this.error.set(error.message),
    );
  }

  private programarSlug(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.revisarSlug(), 500);
  }
}