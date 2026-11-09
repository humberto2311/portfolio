import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import {
  ActualizarMiembro,
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
import { ToastService } from '../../../core/services/toast.service';
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
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);

  readonly panel = this.empresa.panel;
  readonly catalogo = this.empresa.catalogo;
  readonly tabs = TABS;

  readonly tab = signal<TabAjustes>('perfil');
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);

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

  documento: DocumentoEmpresaForm = {
    id: null,
    tipo: '',
    numero: '',
    url: '',
    descripcion: '',
    expedidoEn: '',
    venceEn: '',
  };
  subiendoDocumento = false;
  confirmarDocumento: string | null = null;

  disenoAcento = '#2563eb';
  disenoSecundario = '#0ea5e9';
  disenoFondo = '';
  disenoCss = '';
  erroresDiseno: string[] = [];

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

  cambiarTab(tab: TabAjustes): void {
    this.tab.set(tab);
    this.error.set(null);
    this.aviso.set(null);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
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
    if (this.slugEstado !== 'ocupado' && this.perfilSlug === slugificar(this.actual?.nombre ?? '')) {
      this.perfilSlug = slugificar(valor);
    }
  }

  cambiarSlug(valor: string): void {
    this.perfilSlug = slugificar(valor);
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

  guardarPerfil(): void {
    const empresa = this.actual;
    if (!empresa || !this.puedeEditarPerfil) return;

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

    this.guardando.set(true);
    this.error.set(null);

    this.empresa
      .actualizar(empresa.id, form)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: () => {
          this.aviso.set('Perfil empresarial actualizado.');
          this.refrescar();
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
          this.aviso.set(`${miembro.nombre} ya hace parte del equipo.`);
          this.invitarCorreo = '';
          this.invitarPuesto = '';
          this.recargarPanel();
        },
        error: (err) => this.error.set(mensajeDeError(err, 'No se pudo añadir a esa persona.')),
      });
  }

  cambiarRolMiembro(miembro: MiembroEmpresa, rol: string): void {
    const empresa = this.actual;
    if (!empresa || !this.puedeGestionarEquipo) return;

    const datos: ActualizarMiembro = { rol };
    this.empresa.cambiarRol(empresa.id, miembro.id, datos).subscribe({
      next: () => this.recargarPanel(),
      error: (err) => this.error.set(mensajeDeError(err, 'No se pudo cambiar el rol.')),
    });
  }

  cambiarPuesto(miembro: MiembroEmpresa, puesto: string): void {
    const empresa = this.actual;
    if (!empresa || !this.puedeGestionarEquipo) return;

    this.empresa.cambiarRol(empresa.id, miembro.id, { puesto }).subscribe({
      next: () => this.recargarPanel(),
      error: (err) => this.error.set(mensajeDeError(err, 'No se pudo cambiar el puesto.')),
    });
  }

  alternarVisible(miembro: MiembroEmpresa): void {
    const empresa = this.actual;
    if (!empresa || !this.puedeGestionarEquipo) return;

    this.empresa
      .cambiarRol(empresa.id, miembro.id, { visibleEnEquipo: !miembro.visibleEnEquipo })
      .subscribe({
        next: () => this.recargarPanel(),
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
        this.aviso.set(`${miembro.nombre} ya no hace parte del equipo.`);
        this.recargarPanel();
      },
      error: (err) => this.error.set(mensajeDeError(err, 'No se pudo quitar a esa persona.')),
    });
  }

  cambiarTipoDocumento(tipo: string): void {
    this.documento.tipo = tipo;
    const existente = this.documentos.find((documento) => documento.tipo === tipo);

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

    this.documento = {
      id: null,
      tipo,
      numero: '',
      url: '',
      descripcion: '',
      expedidoEn: '',
      venceEn: '',
    };
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
          if (documento.estado === 'VALIDADO') {
            this.aviso.set(`${this.etiquetaDocumento(documento.tipo)} validado.`);
          } else {
            this.error.set(documento.motivoRechazo || 'El documento fue rechazado.');
          }
          this.documento = {
            id: null,
            tipo: '',
            numero: '',
            url: '',
            descripcion: '',
            expedidoEn: '',
            venceEn: '',
          };
          this.refrescar();
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
        this.aviso.set('Documento eliminado.');
        this.refrescar();
      },
      error: (err) => this.error.set(mensajeDeError(err, 'No se pudo eliminar el documento.')),
    });
  }

  alternarPublicacion(): void {
    const empresa = this.actual;
    if (!empresa || !this.puedePublicar) return;

    const publicada = !empresa.publicada;
    this.guardando.set(true);
    this.error.set(null);

    this.empresa
      .publicar(empresa.id, publicada)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: () => {
          this.aviso.set(publicada ? 'La empresa ya tiene su página pública.' : 'La página pública se ocultó.');
          this.refrescar();
        },
        error: (err) => this.error.set(mensajeDeError(err, 'No se pudo cambiar la publicación.')),
      });
  }

  copiarEnlace(): void {
    const url = this.urlPublica;
    if (isPlatformBrowser(this.platformId) && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(
        () => this.toast.show('Enlace copiado'),
        () => this.toast.show(url),
      );
      return;
    }
    this.toast.show(url);
  }

  abrirPublica(): void {
    const slug = this.actual?.slug;
    if (slug) this.router.navigate(['/empresa', slug]);
  }

  elegirAcento(color: string): void {
    this.disenoAcento = color;
  }

  elegirSecundario(color: string): void {
    this.disenoSecundario = color;
  }

  fondoDesdeArchivo(input: HTMLInputElement): void {
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;

    leerImagen(archivo, 1_900_000).then(
      (url) => {
        this.disenoFondo = url;
        this.erroresDiseno = [];
      },
      (error: Error) => this.erroresDiseno = [error.message],
    );
  }

  quitarFondo(): void {
    this.disenoFondo = '';
  }

  guardarMarca(): void {
    const empresa = this.actual;
    if (!empresa || !this.puedeEditarMarca) return;

    this.guardando.set(true);
    this.erroresDiseno = [];

    this.empresa
      .guardarDiseno(empresa.id, {
        acento: this.disenoAcento || null,
        secundario: this.disenoSecundario || null,
        fondoUrl: this.disenoFondo || null,
        css: this.disenoCss || null,
        activo: true,
      })
      .pipe(finalize(() => (this.guardando.set(false))))
      .subscribe({
        next: (diseno) => {
          if (diseno.errores?.length) {
            this.erroresDiseno = diseno.errores;
            return;
          }

          this.diseno.aplicarAjeno({
            acento: diseno.acento ?? null,
            secundario: diseno.secundario ?? null,
            fondoUrl: diseno.fondoUrl ?? null,
            css: diseno.css ?? null,
            activo: diseno.activo,
          });
          this.aviso.set('Identidad de marca guardada.');
          this.refrescar();
        },
        error: (err) => this.erroresDiseno = [mensajeDeError(err, 'No se pudo guardar la marca.')],
      });
  }

  borrarEmpresa(): void {
    const empresa = this.actual;
    if (!empresa || this.acceso?.rol !== 'ADMIN') return;
    if (!isPlatformBrowser(this.platformId)) return;

    const seguro = window.confirm(
      `¿Borrar "${empresa.nombre}"? Se eliminarán su equipo, documentos y entorno visual.`,
    );
    if (!seguro) return;

    this.empresa.borrar(empresa.id).subscribe({
      next: () => {
        this.toast.show('Empresa eliminada.');
        this.router.navigate(['/app/ajustes/cuenta']);
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

  private aplicarPanel(panel: PanelEmpresa): void {
    const empresa = panel.empresa;

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

    this.perfilSlug = empresa.slug;
    this.slugEstado = 'inactivo';
    this.tipoSeleccionado = empresa.tipo;

    this.disenoAcento = panel.diseno.acento ?? '#2563eb';
    this.disenoSecundario = panel.diseno.secundario ?? '#0ea5e9';
    this.disenoFondo = panel.diseno.fondoUrl ?? '';
    this.disenoCss = panel.diseno.css ?? '';

    this.diseno.aplicarAjeno({
      acento: panel.diseno.acento ?? null,
      secundario: panel.diseno.secundario ?? null,
      fondoUrl: panel.diseno.fondoUrl ?? null,
      css: panel.diseno.css ?? null,
      activo: panel.diseno.activo,
    });
  }

  private refrescar(): void {
    this.empresa.refrescarListado();
    this.empresa.cargarMis(true).subscribe();
    this.recargarPanel();
  }

  private recargarPanel(): void {
    const id = this.actual?.id;
    if (!id) return;

    this.empresa.cargarPanel(id).subscribe((panel) => {
      if (panel) this.aplicarPanel(panel);
    });
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
