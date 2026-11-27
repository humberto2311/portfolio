import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../core/services/auth.service';
import { UserProfileService } from '../../core/services/user-profile.service';
import { TemaService } from '../../core/services/tema.service';
import { ClaseDiseno, Diseno, DisenoEnLista, DisenoService } from '../../core/services/diseno.service';
import { UserPhotoService, FotoPerfil } from '../../core/services/user-photo.service';
import { ResumeService } from '../../core/services/resume.service';
import { ResumeSaveService } from '../../core/services/resume-save.service';
import { ResumeProfile } from '../../core/models/resume.model';
import { Empresa } from '../../core/models/empresa.model';
import { EmpresaService } from '../../core/services/empresa.service';
import { EmpresaCrearComponent } from '../empresa/empresa-crear/empresa-crear.component';
import { GuiaComandosComponent } from '../../shared/components/guia-comandos/guia-comandos.component';
import { MensajesProgramadosComponent } from './mensajes-programados/mensajes-programados.component';
import { AjustesPrivacidadComponent } from './ajustes-privacidad.component';
import { SugerenciasBotService, TipoSugerencia } from '../../core/services/sugerencias-bot.service';
import { GitHubCuentaService } from '../../core/services/github-cuenta.service';

type TabAjustes = 'cuenta' | 'clave' | 'privacidad' | 'empresas' | 'diseno' | 'tarjeta' | 'apariencia' | 'programados' | 'comandos';

interface GrupoAjustes {
  id: string;
  titulo: string;
  icono: string;
  tabs: Array<{ id: TabAjustes; titulo: string; icono: string }>;
}

const GRUPOS: GrupoAjustes[] = [
  {
    id: 'perfil',
    titulo: 'Perfil',
    icono: 'fa-solid fa-user',
    tabs: [
      { id: 'cuenta', titulo: 'Cuenta', icono: 'fa-solid fa-user' },
      { id: 'empresas', titulo: 'Empresas', icono: 'fa-solid fa-building' }
    ]
  },
  {
    id: 'diseno',
    titulo: 'Diseño',
    icono: 'fa-solid fa-palette',
    tabs: [
      { id: 'diseno', titulo: 'Mi diseño', icono: 'fa-solid fa-palette' },
      { id: 'tarjeta', titulo: 'Tarjeta', icono: 'fa-solid fa-id-card' },
      { id: 'apariencia', titulo: 'Apariencia', icono: 'fa-solid fa-circle-half-stroke' }
    ]
  },
  {
    id: 'seguridad',
    titulo: 'Seguridad',
    icono: 'fa-solid fa-shield-halved',
    tabs: [
      { id: 'clave', titulo: 'Contraseña', icono: 'fa-solid fa-key' },
      { id: 'privacidad', titulo: 'Privacidad', icono: 'fa-solid fa-user-shield' }
    ]
  },
  {
    id: 'chat',
    titulo: 'Chat',
    icono: 'fa-solid fa-comments',
    tabs: [
      { id: 'programados', titulo: 'Programados', icono: 'fa-regular fa-clock' },
      { id: 'comandos', titulo: 'Comandos', icono: 'fa-solid fa-terminal' }
    ]
  }
];

const TABS: Array<{ id: TabAjustes; titulo: string; icono: string }> = GRUPOS.flatMap((grupo) => grupo.tabs);

const ACENTO_POR_DEFECTO = '#4a9eff';

@Component({
  selector: 'app-ajustes-cuenta',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, EmpresaCrearComponent, GuiaComandosComponent, MensajesProgramadosComponent, AjustesPrivacidadComponent],
  templateUrl: './ajustes-cuenta.component.html',
  styleUrls: ['./ajustes-cuenta.component.scss'],
})
export class AjustesCuentaComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private userProfileService = inject(UserProfileService);
  private resume = inject(ResumeService);
  private resumeSave = inject(ResumeSaveService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);
  private destroyRef = inject(DestroyRef);
  private fotos = inject(UserPhotoService);
  readonly tema = inject(TemaService);
  readonly diseno = inject(DisenoService);
  readonly empresas = inject(EmpresaService);
  readonly sugerenciasService = inject(SugerenciasBotService);
  readonly githubService = inject(GitHubCuentaService);

  @ViewChild('tabsNav') tabsNav?: ElementRef<HTMLElement>;

  readonly tabs = TABS;
  readonly grupos = GRUPOS;

  /** El grupo al que pertenece la pestaña abierta. */
  readonly grupoActivo = computed(() => {
    const actual = this.tab();
    return GRUPOS.find((grupo) => grupo.tabs.some((t) => t.id === actual))?.id ?? 'perfil';
  });

  /** Las pestañas del grupo abierto: la barra muestra solo esas. */
  readonly tabsDelGrupo = computed(() => {
    const grupo = GRUPOS.find((g) => g.id === this.grupoActivo());
    return grupo ? grupo.tabs : [];
  });

  /** Abre un grupo y, si la pestaña actual no es suya, la primera de él. */
  abrirGrupo(grupo: GrupoAjustes): void {
    const yaEsSuya = grupo.tabs.some((t) => t.id === this.tab());
    if (!yaEsSuya) this.cambiarTab(grupo.tabs[0].id);
  }
  readonly tab = signal<TabAjustes>('cuenta');
  readonly mostrarCrear = signal(false);
  readonly cargandoCuenta = signal(true);
  readonly cargandoCv = signal(true);
  readonly error = signal<string | null>(null);
  readonly exito = signal<string | null>(null);
  readonly galeria = signal<FotoPerfil[]>([]);

  readonly generos = [
    { valor: 'masculino', texto: 'Masculino' },
    { valor: 'femenino', texto: 'Femenino' },
    { valor: 'otro', texto: 'Otro' },
    { valor: 'prefiero_no_decir', texto: 'Prefiero no decir' },
  ];

  readonly maxDate = new Date().toISOString().split('T')[0];

  readonly tiposSugerencia: { valor: TipoSugerencia; etiqueta: string; icono: string }[] = [
    { valor: 'NUEVO', etiqueta: 'Un bot nuevo', icono: 'fa-solid fa-robot' },
    { valor: 'HERRAMIENTA', etiqueta: 'Una herramienta', icono: 'fa-solid fa-plug' },
    { valor: 'MEJORA', etiqueta: 'Una mejora', icono: 'fa-solid fa-wand-magic-sparkles' },
  ];
  readonly tipoSugerencia = signal<TipoSugerencia>('NUEVO');
  readonly nombreSugerencia = signal('');
  readonly detalleSugerencia = signal('');
  readonly enviandoSugerencia = signal(false);

  readonly tokenGithub = signal('');
  readonly guardandoGithub = signal(false);
  readonly errorGithub = signal<string | null>(null);

  readonly paleta = ['#4a9eff', '#3fb950', '#f5b75e', '#e5484d', '#c297ff', '#ff7ac6', '#2dd4bf', '#e8e8e8'];

  nombre = '';
  gitlabUsuario = '';
  fuenteEnCurso: 'gitlab' | null = null;
  telefono = '';
  genero = '';
  nacimiento = '';
  email = '';
  guardandoDatos = false;

  claveActual = '';
  claveNueva = '';
  claveConfirmar = '';
  guardandoClave = false;
  tieneContrasena = true;

  cv: ResumeProfile | null = null;
  alternandoCv = false;

  acento = ACENTO_POR_DEFECTO;
  secundario = '';
  fondoUrl: string | null = null;
  css = '';
  acentoTarjeta = '';
  secundarioTarjeta = '';
  cssTarjeta = '';
  fondoTarjetaUrl: string | null = null;
  readonly disenosGuardados = signal<DisenoEnLista[]>([]);
  nombreDiseno = '';
  guardandoLista = false;
  erroresDiseno: string[] = [];
  guardandoDiseno = false;

  private datosBase = { nombre: '', telefono: '', genero: '', nacimiento: '' };
  fuentesBase = { gitlab: '' };
  private disenoBase: Diseno | null = null;
  private disenoFotoBase = JSON.stringify([ACENTO_POR_DEFECTO, '', '', '']);
  private tarjetaFotoBase = JSON.stringify(['', '', '', '']);
  private borradorTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const inicial = params.get('tab') as TabAjustes | null;
        if (inicial && TABS.some((t) => t.id === inicial)) this.tab.set(inicial);
      });

    const usuario = this.auth.currentUser();
    if (usuario) {
      this.nombre = usuario.fullName ?? '';
      this.email = usuario.email ?? '';
      this.telefono = usuario.phone ?? '';
      this.genero = usuario.gender ?? '';
      this.nacimiento = usuario.birthDate ?? '';
      this.datosBase = this.datosActuales();
    }

    this.cargarEstado();
    this.cargarCv();
    this.cargarSugerencias();
    this.cargarDiseno();
    this.empresas.cargarMis().subscribe();
  }

  ngOnDestroy(): void {
    if (this.borradorTimer) clearTimeout(this.borradorTimer);
    this.diseno.limpiarAjeno();
    this.diseno.limpiarPrevia();
  }

  get cvVisible(): boolean {
    return this.cv?.isPublic === true;
  }

  get datosSucios(): boolean {
    const base = this.datosBase;
    return (
      this.nombre !== base.nombre ||
      this.telefono !== base.telefono ||
      this.genero !== base.genero ||
      this.nacimiento !== base.nacimiento
    );
  }

  get datosValidos(): boolean {
    return this.nombre.trim().length >= 2;
  }

  get clavePendiente(): boolean {
    return Boolean(this.claveActual || this.claveNueva || this.claveConfirmar);
  }

  get claveLista(): boolean {
    return (
      this.claveNueva.length >= 8 &&
      this.claveNueva === this.claveConfirmar &&
      (!this.tieneContrasena || this.claveActual.length > 0)
    );
  }

  get disenoSucio(): boolean {
    return this.fotoDiseno() !== this.disenoFotoBase;
  }

  get tarjetaSucia(): boolean {
    return this.fotoTarjeta() !== this.tarjetaFotoBase;
  }

  get pendientesDiseno(): string {
    if (this.disenoSucio && this.tarjetaSucia) return 'el perfil y la tarjeta';
    if (this.disenoSucio) return 'el perfil';
    if (this.tarjetaSucia) return 'la tarjeta';
    return '';
  }

  get puedeGuardarDiseno(): boolean {
    return (
      this.esHex(this.acento) &&
      (!this.secundario || this.esHex(this.secundario)) &&
      (!this.acentoTarjeta || this.esHex(this.acentoTarjeta)) &&
      (!this.secundarioTarjeta || this.esHex(this.secundarioTarjeta))
    );
  }

  pendiente(id: TabAjustes): boolean {
    if (id === 'cuenta') return this.datosSucios;
    if (id === 'clave') return this.clavePendiente;
    if (id === 'diseno') return this.disenoSucio;
    if (id === 'tarjeta') return this.tarjetaSucia;
    return false;
  }

  cambiarTab(tab: TabAjustes): void {
    if (this.tab() === tab) return;

    this.tab.set(tab);
    this.error.set(null);
    this.exito.set(null);

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

  descartarDatos(): void {
    const base = this.datosBase;
    this.nombre = base.nombre;
    this.telefono = base.telefono;
    this.genero = base.genero;
    this.nacimiento = base.nacimiento;
    this.error.set(null);
    this.exito.set(null);
  }

  get fuentesSucias(): boolean {
    return this.gitlabUsuario !== this.fuentesBase.gitlab;
  }

  guardandoFuente(fuente: 'gitlab'): boolean {
    return this.fuenteEnCurso === fuente;
  }

  guardarFuente(fuente: 'gitlab'): void {
    if (this.fuenteEnCurso) return;

    const valor = this.gitlabUsuario.trim();
    this.fuenteEnCurso = fuente;
    this.error.set(null);
    this.exito.set(null);

    this.userProfileService
      .updateGitlabUsername(valor)
      .pipe(finalize(() => (this.fuenteEnCurso = null)))
      .subscribe({
        next: (datos) => {
          this.gitlabUsuario = datos.gitlabUsername ?? '';
          this.fuentesBase = { gitlab: this.gitlabUsuario };
          this.exito.set(
            valor
              ? 'Guardado: importarás tus proyectos de GitLab.'
              : 'Se quitó el usuario de GitLab.'
          );
        },
        error: (err) => {
          const mensaje = err?.error?.message || err?.error?.error;
          this.error.set(mensaje || 'No se pudo guardar el usuario.');
        },
      });
  }

  guardarDatos(): void {
    if (!this.datosValidos) {
      this.error.set('Escribe tu nombre con al menos dos letras.');
      return;
    }

    this.guardandoDatos = true;
    this.error.set(null);
    this.exito.set(null);

    this.auth
      .actualizarPerfil({
        fullName: this.nombre.trim(),
        phone: this.telefono.trim(),
        gender: this.genero,
        birthDate: this.nacimiento || undefined,
      })
      .pipe(finalize(() => (this.guardandoDatos = false)))
      .subscribe({
        next: (datos) => {
          this.auth.sincronizarUsuario({
            fullName: datos.fullName,
            phone: datos.phone ?? undefined,
            gender: datos.gender ?? undefined,
            birthDate: datos.birthDate ?? undefined,
          });
          this.nombre = datos.fullName;
          this.telefono = datos.phone ?? '';
          this.genero = datos.gender ?? '';
          this.nacimiento = datos.birthDate ?? '';
          this.datosBase = this.datosActuales();
          this.exito.set('Tus datos ya están actualizados.');
        },
        error: () => this.error.set('No se pudieron guardar los datos.'),
      });
  }

  descartarClave(): void {
    this.claveActual = '';
    this.claveNueva = '';
    this.claveConfirmar = '';
    this.error.set(null);
    this.exito.set(null);
  }

  guardarClave(): void {
    if (this.claveNueva.length < 8) {
      this.error.set('La contraseña nueva necesita al menos 8 caracteres.');
      return;
    }
    if (this.claveNueva !== this.claveConfirmar) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }

    this.guardandoClave = true;
    this.error.set(null);
    this.exito.set(null);

    this.auth
      .cambiarContrasena(this.claveActual, this.claveNueva, this.claveConfirmar)
      .pipe(finalize(() => (this.guardandoClave = false)))
      .subscribe({
        next: () => {
          this.descartarClave();
          this.tieneContrasena = true;
          this.exito.set('Contraseña actualizada.');
        },
        error: (err) => this.error.set(err.error?.message ?? 'No se pudo cambiar la contraseña.'),
      });
  }

  alternarVisibilidadCv(): void {
    if (!this.cv?.id) return;

    const publicar = this.cv.isPublic !== true;
    this.alternandoCv = true;
    this.error.set(null);
    this.exito.set(null);

    const accion$ = publicar
      ? this.resumeSave.publishProfile(this.cv.id)
      : this.resumeSave.unpublishProfile(this.cv.id);

    accion$
      .pipe(finalize(() => (this.alternandoCv = false)))
      .subscribe({
        next: (profile) => {
          this.cv = profile;
          this.exito.set(publicar ? 'Tu hoja de vida es pública.' : 'Tu hoja de vida es privada.');
        },
        error: () => this.error.set('No se pudo cambiar la visibilidad de tu hoja de vida.'),
      });
  }

  abrirCrearEmpresa(): void {
    this.mostrarCrear.set(true);
  }

  cerrarCrearEmpresa(): void {
    this.mostrarCrear.set(false);
  }

  empresaCreada(empresa: Empresa): void {
    this.mostrarCrear.set(false);
    this.empresas.refrescarListado();
    this.empresas.cargarMis(true).subscribe();
    this.empresas.entrar(empresa.id);
    this.router.navigate(['/app/empresa']);
  }

  entrarEmpresa(empresa: Empresa): void {
    this.empresas.entrar(empresa.id);
    this.router.navigate(['/app/empresa']);
  }

  salirModoEmpresa(): void {
    this.empresas.salir();
    this.router.navigate(['/app']);
  }

  ponerTema(claro: boolean): void {
    if (this.tema.claro() === claro) return;
    this.tema.guardar(claro);
  }

  cambiarAcento(valor: string): void {
    this.acento = valor;
    this.previsualizar();
  }

  cambiarSecundario(valor: string): void {
    this.secundario = valor;
    this.previsualizar();
  }

  cambiarCss(valor: string): void {
    this.css = valor;
    this.previsualizar();
  }

  cambiarAcentoTarjeta(valor: string): void {
    this.acentoTarjeta = valor;
    this.previsualizar();
  }

  cambiarSecundarioTarjeta(valor: string): void {
    this.secundarioTarjeta = valor;
    this.previsualizar();
  }

  cambiarCssTarjeta(valor: string): void {
    this.cssTarjeta = valor;
    this.previsualizar();
  }

  elegirFondoTarjeta(url: string | null): void {
    this.fondoTarjetaUrl = url;
    this.previsualizar();
  }

  fondoTarjetaDesdeArchivo(input: HTMLInputElement): void {
    const archivo = input.files?.[0];
    input.value = '';

    if (!archivo) return;

    if (!/^image\/(png|jpeg|webp)$/.test(archivo.type)) {
      this.erroresDiseno = ['Usa una imagen PNG, JPG o WEBP.'];
      return;
    }
    if (archivo.size > 1_500_000) {
      this.erroresDiseno = ['La imagen pesa demasiado: usa una de hasta 1,5 MB.'];
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      this.erroresDiseno = [];
      this.elegirFondoTarjeta(String(lector.result));
    };
    lector.onerror = () => (this.erroresDiseno = ['No se pudo leer la imagen.']);
    lector.readAsDataURL(archivo);
  }

  disenosDe(clase: ClaseDiseno): DisenoEnLista[] {
    return this.disenosGuardados().filter((d) => d.clase === clase);
  }

  puedeGuardarOtro(clase: ClaseDiseno): boolean {
    return this.disenosDe(clase).length < 5;
  }

  guardarDisenoEnLista(clase: ClaseDiseno): void {
    if (!this.puedeGuardarOtro(clase)) {
      this.erroresDiseno = ['Solo puedes tener 5 diseños guardados de cada tipo. Elimina uno primero.'];
      return;
    }

    this.guardandoLista = true;
    this.erroresDiseno = [];
    this.error.set(null);

    const datos: Partial<Diseno> =
      clase === 'tarjeta'
        ? {
            acento: this.acento,
            secundario: this.secundario,
            css: this.css,
            acentoTarjeta: this.acentoTarjeta,
            secundarioTarjeta: this.secundarioTarjeta,
            tarjetaFondoUrl: this.fondoTarjetaUrl,
            cssTarjeta: this.cssTarjeta,
          }
        : {
            acento: this.acento,
            secundario: this.secundario,
            fondoUrl: this.fondoUrl,
            css: this.css,
            acentoTarjeta: this.acentoTarjeta,
            secundarioTarjeta: this.secundarioTarjeta,
            tarjetaFondoUrl: this.fondoTarjetaUrl,
            cssTarjeta: this.cssTarjeta,
          };

    this.diseno
      .guardarEnLista(clase, this.nombreDiseno, datos)
      .pipe(finalize(() => (this.guardandoLista = false)))
      .subscribe({
        next: (respuesta) => {
          if (respuesta?.errores?.length) {
            this.erroresDiseno = respuesta.errores;
            return;
          }
          this.disenoBase = this.diseno.propio();
          this.disenosGuardados.set(this.disenoBase?.guardados ?? []);
          this.nombreDiseno = '';
          this.exito.set('Diseño guardado en tu lista.');
        },
        error: (err) => {
          this.erroresDiseno = err?.error?.errores?.length
            ? err.error.errores
            : ['No se pudo guardar el diseño en tu lista.'];
        },
      });
  }

  usarDisenoGuardado(diseno: DisenoEnLista): void {
    this.guardandoLista = true;
    this.error.set(null);

    this.diseno
      .activarGuardado(diseno.id)
      .pipe(finalize(() => (this.guardandoLista = false)))
      .subscribe({
        next: (respuesta) => {
          if (respuesta?.errores?.length) {
            this.erroresDiseno = respuesta.errores;
            return;
          }
          this.disenoBase = this.diseno.propio();
          this.disenosGuardados.set(this.disenoBase?.guardados ?? []);
          this.aplicarDiseno(this.disenoBase);
          this.exito.set(`Ahora usas «${diseno.nombre}».`);
        },
        error: () => this.error.set('No se pudo activar ese diseño.'),
      });
  }

  borrarDisenoGuardado(diseno: DisenoEnLista): void {
    if (!confirm(`¿Eliminar «${diseno.nombre}»? No se puede deshacer.`)) return;

    this.guardandoLista = true;

    this.diseno
      .borrarGuardado(diseno.id)
      .pipe(finalize(() => (this.guardandoLista = false)))
      .subscribe({
        next: (respuesta) => {
          if (respuesta?.errores?.length) {
            this.erroresDiseno = respuesta.errores;
            return;
          }
          this.disenoBase = this.diseno.propio();
          this.disenosGuardados.set(this.disenoBase?.guardados ?? []);
          this.exito.set('Diseño eliminado de tu lista.');
        },
        error: () => this.error.set('No se pudo eliminar ese diseño.'),
      });
  }

  inicialesPrevias(): string {
    const partes = this.nombre.trim().split(/\s+/).filter(Boolean);

    if (!partes.length) return '??';

    return partes.length === 1
      ? partes[0].substring(0, 2).toUpperCase()
      : (partes[0][0] + partes[1][0]).toUpperCase();
  }

  elegirFondo(url: string | null): void {
    this.fondoUrl = url;
    this.previsualizar();
  }

  fondoDesdeArchivo(input: HTMLInputElement): void {
    const archivo = input.files?.[0];
    input.value = '';

    if (!archivo) return;

    if (!/^image\/(png|jpe?g|webp)$/i.test(archivo.type)) {
      this.erroresDiseno = ['El fondo debe ser PNG, JPG o WEBP.'];
      return;
    }
    if (archivo.size > 1_500_000) {
      this.erroresDiseno = ['La imagen pesa demasiado: usa una de hasta 1,5 MB.'];
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      this.erroresDiseno = [];
      this.elegirFondo(String(lector.result));
    };
    lector.onerror = () => (this.erroresDiseno = ['No se pudo leer la imagen.']);
    lector.readAsDataURL(archivo);
  }

  descartarDiseno(): void {
    this.acento = this.disenoBase?.acento ?? ACENTO_POR_DEFECTO;
    this.secundario = this.disenoBase?.secundario ?? '';
    this.fondoUrl = this.disenoBase?.fondoUrl ?? null;
    this.css = this.disenoBase?.css ?? '';
    this.disenoFotoBase = this.fotoDiseno();
    this.limpiarAvisosDiseno();
    this.previsualizar();
  }

  descartarTarjeta(): void {
    this.acentoTarjeta = this.disenoBase?.acentoTarjeta ?? '';
    this.secundarioTarjeta = this.disenoBase?.secundarioTarjeta ?? '';
    this.cssTarjeta = this.disenoBase?.cssTarjeta ?? '';
    this.fondoTarjetaUrl = this.disenoBase?.tarjetaFondoUrl ?? null;
    this.tarjetaFotoBase = this.fotoTarjeta();
    this.limpiarAvisosDiseno();
    this.previsualizar();
  }

  private limpiarAvisosDiseno(): void {
    this.erroresDiseno = [];
    this.error.set(null);
    this.exito.set(null);
  }

  guardarDiseno(mensaje = 'Diseño guardado. Ya se ve en tu perfil y en tu tarjeta.'): void {
    if (!this.puedeGuardarDiseno) {
      this.erroresDiseno = ['Cada color debe escribirse como #rgb o #rrggbb.'];
      return;
    }
    if (!this.disenoSucio && !this.tarjetaSucia) return;

    this.erroresDiseno = [];
    this.guardandoDiseno = true;
    this.error.set(null);
    this.exito.set(null);

    const { acento, secundario, fondoUrl, css, acentoTarjeta, secundarioTarjeta, cssTarjeta, tarjetaFondoUrl } =
      this.coleccion();

    this.diseno
      .guardar({ acento, secundario, fondoUrl, css, acentoTarjeta, secundarioTarjeta, cssTarjeta, tarjetaFondoUrl })
      .pipe(finalize(() => (this.guardandoDiseno = false)))
      .subscribe({
        next: () => {
          this.aplicarDiseno(this.diseno.propio());
          this.exito.set(mensaje);
        },
        error: (err) => {
          this.erroresDiseno = err?.error?.errores?.length
            ? err.error.errores
            : ['No se pudo guardar el diseño.'];
        },
      });
  }

  quitarDiseno(): void {
    this.guardandoDiseno = true;
    this.error.set(null);
    this.exito.set(null);

    this.diseno
      .quitar()
      .pipe(finalize(() => (this.guardandoDiseno = false)))
      .subscribe({
        next: () => {
          this.disenoBase = this.diseno.propio();
          this.aplicarDiseno(this.disenoBase);
          this.erroresDiseno = [];
          this.diseno.limpiarAjeno();
          this.diseno.limpiarPrevia();
          this.exito.set('Diseño quitado. Vuelve el aspecto predeterminado.');
        },
        error: () => this.error.set('No se pudo quitar el diseño.'),
      });
  }

  quitarDisenoTarjeta(): void {
    this.acentoTarjeta = '';
    this.secundarioTarjeta = '';
    this.cssTarjeta = '';
    this.fondoTarjetaUrl = null;
    this.previsualizar();
    this.guardarDiseno('Tu tarjeta vuelve a usar el diseño de tu perfil.');
  }

  private cargarEstado(): void {
    this.auth
      .estado()
      .pipe(finalize(() => this.cargandoCuenta.set(false)))
      .subscribe({
        next: (estado) => {
          this.email = estado.email;
          this.tieneContrasena = estado.tieneContrasena;

          if (this.datosSucios) return;

          this.nombre = estado.nombre ?? '';
          this.gitlabUsuario = estado.gitlabUsername ?? '';
          this.fuentesBase = { gitlab: this.gitlabUsuario };
          this.telefono = estado.telefono ?? '';
          this.genero = estado.genero ?? '';
          this.nacimiento = estado.nacimiento ?? '';
          this.datosBase = this.datosActuales();
        },
        error: () => this.error.set('No se pudieron cargar tus datos. Vuelve a iniciar sesión.'),
      });
  }

  private cargarCv(): void {
    const userId = this.auth.currentUser()?.id;
    if (!userId) {
      this.cargandoCv.set(false);
      return;
    }

    this.resume
      .getProfileByUserId(userId)
      .pipe(finalize(() => this.cargandoCv.set(false)))
      .subscribe({
        next: (profile) => (this.cv = profile),
        error: () => (this.cv = null),
      });
  }

  private cargarDiseno(): void {
    this.diseno.cargarPropio().subscribe((d) => {
      this.disenoBase = d;
      this.disenosGuardados.set(d.guardados ?? []);
      if (!this.disenoSucio && !this.tarjetaSucia) this.aplicarDiseno(d);
      this.previsualizar();

      const userId = this.auth.currentUser()?.id;
      if (userId) {
        this.fotos.listar(userId).subscribe({
          next: (listado) => this.galeria.set(listado),
          error: () => this.galeria.set([]),
        });
      }
    });
  }

  private aplicarDiseno(d: Diseno): void {
    this.acento = d.acento ?? ACENTO_POR_DEFECTO;
    this.secundario = d.secundario ?? '';
    this.fondoUrl = d.fondoUrl ?? null;
    this.css = d.css ?? '';
    this.acentoTarjeta = d.acentoTarjeta ?? '';
    this.secundarioTarjeta = d.secundarioTarjeta ?? '';
    this.cssTarjeta = d.cssTarjeta ?? '';
    this.fondoTarjetaUrl = d.tarjetaFondoUrl ?? null;
    this.disenoFotoBase = this.fotoDiseno();
    this.tarjetaFotoBase = this.fotoTarjeta();
  }

  private datosActuales() {
    return {
      nombre: this.nombre,
      telefono: this.telefono,
      genero: this.genero,
      nacimiento: this.nacimiento,
    };
  }

  private fotoDiseno(): string {
    return JSON.stringify([this.acento, this.secundario, this.fondoUrl ?? '', this.css]);
  }

  private fotoTarjeta(): string {
    return JSON.stringify([this.acentoTarjeta, this.secundarioTarjeta, this.fondoTarjetaUrl ?? '', this.cssTarjeta]);
  }

  private esHex(valor: string): boolean {
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(valor.trim());
  }

  private coleccion(): Diseno {
    return {
      acento: this.esHex(this.acento) ? this.acento.trim() : null,
      secundario: this.esHex(this.secundario) ? this.secundario.trim() : null,
      fondoUrl: this.fondoUrl,
      css: this.css.trim() || null,
      activo: true,
      acentoTarjeta: this.esHex(this.acentoTarjeta) ? this.acentoTarjeta.trim() : null,
      secundarioTarjeta: this.esHex(this.secundarioTarjeta) ? this.secundarioTarjeta.trim() : null,
      cssTarjeta: this.cssTarjeta.trim() || null,
      tarjetaFondoUrl: this.fondoTarjetaUrl,
      tarjetaActivo: Boolean(
        this.acentoTarjeta || this.secundarioTarjeta || this.cssTarjeta || this.fondoTarjetaUrl
      ),
    };
  }

  private previsualizar(): void {
    if (this.borradorTimer) clearTimeout(this.borradorTimer);

    this.borradorTimer = setTimeout(() => {
      const borrador = this.coleccion();
      this.diseno.aplicarAjeno(borrador);
      this.diseno.aplicarPrevia(this.diseno.estaTarjeta(borrador));
    }, 350);
  }

  conectarGithub(): void {
    const token = this.tokenGithub().trim();
    if (!token || this.guardandoGithub()) return;

    this.guardandoGithub.set(true);
    this.errorGithub.set(null);

    this.githubService
      .conectar(token)
      .pipe(
        finalize(() => this.guardandoGithub.set(false)),
        takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.tokenGithub.set(''),
        error: (e) => this.errorGithub.set(e?.error?.mensaje ?? 'No se pudo conectar GitHub.'),
      });
  }

  desconectarGithub(): void {
    this.githubService
      .desconectar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => this.errorGithub.set('No se pudo desconectar GitHub.') });
  }

  private cargarSugerencias(): void {
    this.githubService.cargar().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ error: () => {} });

    this.sugerenciasService
      .cargar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => this.sugerenciasService.sugerencias.set([]) });
  }

  enviarSugerencia(): void {
    const nombre = this.nombreSugerencia().trim();
    if (!nombre || this.enviandoSugerencia()) return;

    this.enviandoSugerencia.set(true);
    this.sugerenciasService
      .crear(this.tipoSugerencia(), nombre, this.detalleSugerencia().trim())
      .pipe(
        finalize(() => this.enviandoSugerencia.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.nombreSugerencia.set('');
          this.detalleSugerencia.set('');
          this.exito.set('Sugerencia enviada. Gracias: queda anotada en tu cuenta.');
          this.cargarSugerencias();
          setTimeout(() => this.exito.set(null), 4000);
        },
        error: (err) => {
          this.error.set(
            err?.error?.message ?? 'No pude guardar la sugerencia. Inténtalo otra vez.',
          );
        },
      });
  }

  borrarSugerencia(id: string): void {
    this.sugerenciasService
      .borrar(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this.cargarSugerencias() });
  }

  etiquetaTipo(tipo: TipoSugerencia): string {
    return this.tiposSugerencia.find((t) => t.valor === tipo)?.etiqueta ?? tipo;
  }
}
