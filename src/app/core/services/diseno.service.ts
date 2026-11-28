import { DOCUMENT } from '@angular/common';
import { Injectable, Signal, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Diseno {
  acento: string | null;
  secundario: string | null;
  fondoUrl: string | null;
  css: string | null;
  activo: boolean;
  acentoTarjeta?: string | null;
  secundarioTarjeta?: string | null;
  cssTarjeta?: string | null;
  tarjetaFondoUrl?: string | null;
  tarjetaActivo?: boolean;
  activoId?: string | null;
  tarjetaActivoId?: string | null;
  guardados?: DisenoEnLista[];
}

export interface DisenoGuardado extends Diseno {
  errores?: string[];
}

export interface DisenoEnLista {
  id: string;
  clase: string;
  nombre: string;
  acento: string | null;
  secundario: string | null;
  fondoUrl: string | null;
  css: string | null;
  acentoTarjeta: string | null;
  secundarioTarjeta: string | null;
  tarjetaFondoUrl: string | null;
  cssTarjeta: string | null;
  activo: boolean;
  activoTarjeta: boolean;
  creadoEn: string | null;
}

export type ClaseDiseno = 'perfil' | 'tarjeta';

const VACIO: Diseno = {
  acento: null,
  secundario: null,
  fondoUrl: null,
  css: null,
  activo: false,
  acentoTarjeta: null,
  secundarioTarjeta: null,
  cssTarjeta: null,
  tarjetaFondoUrl: null,
  tarjetaActivo: false,
  activoId: null,
  tarjetaActivoId: null,
  guardados: [],
};
const HOJA_PROPIA = 'diseno-propio';
const HOJA_AJENA = 'diseno-ajeno';
const HOJA_PREVIA = 'diseno-previa-tarjeta';
export const CLASE_VISITA = 'diseno-visita';
export const CLASE_PREVIA = 'diseno-previa';

/**
 * Cuando alguien abre un perfil con diseño, el diseño manda: el tema claro u oscuro de la
 * app no se pinta encima de él (cambiaba los colores y dejaba letras sin contraste). Este
 * atributo se pone en <html> mientras haya un diseño a la vista y `styles.scss` lo usa
 * para rendirse.
 */
export const ATRIBUTO_DISENO = 'data-diseno';

const SUPERFICIES: [string, number, string, number][] = [
  ['--bg-main', 7, 'main', 92],
  ['--bg-elevated', 14, 'elevated', 86],
  ['--bg-card', 10, 'card', 82],
  ['--bg-sidebar', 11, 'sidebar', 86],
  ['--bg-input', 6, 'input', 90],
  ['--bg-hover', 20, 'hover', 78],
];

/**
 * Cuántos diseños hay a la vista (el propio y/o el del perfil que se visita). Va como valor de
 * `data-diseno`: mientras sea mayor que 0 el tema se rinde. `styles.scss` usa `[data-diseno]`
 * (cualquier valor) para ceder, y el diseño propio, para el `padding` de `.perfil-container`,
 * usa un valor mayor que 1 — así, al visitar un perfil SIN diseño, la página recupera su aire.
 */
export const MARCA_DISENO_VISITA = 'visita';

/**
 * Marca en <html> mientras la vista de perfil está abierta, tenga diseño o no. `styles.scss`
 * la usa para pintar el fondo del perfil directamente en <body>: así no queda ninguna franja
 * del tema alrededor de la tarjeta, venga de donde venga el contenedor intermedio.
 */
export const ATRIBUTO_VISTA_PERFIL = 'data-vista-perfil';

/** Lo que un diseño propio necesita para que se vea igual con el tema claro y el oscuro. */
const NEUTROS = '--text-secondary: #5a646f; --text-muted: #5a646f; --text-faint: #666f7a;'
  + ' --warning: #8a5a12; --danger: #b42318; --success: #157347;'
  + ' --bg-navbar: rgba(255, 255, 255, 0.92); --bg-navbar-scrolled: #ffffff;'
  + ' color-scheme: light;';

/**
 * Propiedades que se le quitan a las reglas de un diseño. Ojo: aquí no están `position`,
 * `margin`, `padding`, `font-size` ni `top/left` — quitarlas rompía el diseño del perfil
 * (el avatar dejaba de apoyarse centrado sobre la portada y los botones perdían su sitio).
 */
const MEDIDAS = /(^|[{;])\s*(width|height|min-width|min-height|max-width|max-height|aspect-ratio|inset)\s*:[^;}]*;?/gi;

/**
 * Reglas del perfil que quedan anuladas mientras haya un diseño activo, para que el diseño
 * sea el que decide el sitio del avatar y el solapamiento con la portada.
 */
const NEUTRALIZADO = `
html[${ATRIBUTO_DISENO}] .perfil-container .header-card,
html[${ATRIBUTO_DISENO}] .perfil-container .cover-banner {
  clip-path: none !important;
}
html[${ATRIBUTO_DISENO}] .perfil-container .header-card {
  margin-top: 0 !important;
}
html[${ATRIBUTO_DISENO}] .perfil-container .header-row {
  margin-top: -55px !important;
  align-items: flex-end !important;
}
html[${ATRIBUTO_DISENO}] .perfil-container .avatar-block {
  align-self: flex-start !important;
  align-items: flex-start !important;
  width: fit-content !important;
}
html[${ATRIBUTO_DISENO}] .perfil-container .avatar-block app-notas-usuario {
  width: 100% !important;
  max-width: 128px !important;
  margin: 0 auto 4px !important;
  text-align: center !important;
}
/* El avatar y el anillo van en el mismo sitio que sin diseño: el círculo no se mueve. */
html[${ATRIBUTO_DISENO}] .perfil-container .avatar-eleccion {
  display: block !important;
  position: relative !important;
  width: fit-content !important;
  margin: 0 !important;
  align-self: flex-start !important;
}
html[${ATRIBUTO_DISENO}] .perfil-container .avatar-estado {
  display: block !important;
  padding: 0 !important;
  background: none !important;
  border-radius: 0 !important;
}
html[${ATRIBUTO_DISENO}] .perfil-container .avatar-wrapper {
  width: 128px !important;
  height: 128px !important;
  box-sizing: content-box !important;
  margin: 0 !important;
  position: relative !important;
}
html[${ATRIBUTO_DISENO}] .perfil-container .avatar-wrapper .profile-img {
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
}
`;

@Injectable({ providedIn: 'root' })
export class DisenoService {
  private readonly http = inject(HttpClient);
  private readonly documento = inject(DOCUMENT);
  private readonly raiz = `${environment.apiUrl}/api/users/diseno`;

  readonly propio = signal<Diseno>(VACIO);
  readonly ajeno = signal<Diseno | null>(null);
  readonly previa = signal<Diseno | null>(null);

  /** La marca que le dice a `styles.scss` que el diseño va por encima del tema. */
  readonly mandando = signal(false);

  /** Si el diseño que manda es el propio (no el de un perfil que se está visitando). */
  readonly esPropio = signal(true);

  /** Mientras es `true`, la página es un perfil: su fondo se pinta en <body>. */
  readonly enVistaPerfil = signal(false);

  constructor() {
    // La marca se vuelve a poner si el <style> desaparece (una recarga de la app). En el
    // servidor (SSR/prerender) no hay MutationObserver ni <html> que marcar.
    const vista = this.documento.defaultView;

    if (typeof vista?.MutationObserver !== 'function') return;

    const observador = new vista.MutationObserver(() => this.marcarSiFalta());
    observador.observe(this.documento.head, { childList: true });
  }

  /**
   * Pone o quita la marca que hace que el diseño mande sobre el tema claro/oscuro.
   * `propio` dice si el diseño a la vista es el del dueño de la sesión o el de un perfil
   * visitado: el `padding` de `.perfil-container` solo se anula para el propio.
   */
  ponerMarca(activa: boolean, propio = true): void {
    if (this.mandando() === activa && this.esPropio() === propio) {
      this.marcarSiFalta();
      return;
    }

    this.mandando.set(activa);
    this.esPropio.set(propio);
    this.marcarSiFalta();
  }

  /**
   * Entra o sale de la vista de perfil. Al salir se quita la marca y <body> recupera su fondo
   * normal, para no dejar el diseño pegado en el feed, proyectos o ajustes.
   */
  ponerVistaPerfil(activa: boolean): void {
    if (this.enVistaPerfil() === activa) return;

    this.enVistaPerfil.set(activa);

    const raiz = this.documento?.documentElement;

    if (!raiz) return;

    if (activa) {
      raiz.setAttribute(ATRIBUTO_VISTA_PERFIL, 'si');
    } else {
      raiz.removeAttribute(ATRIBUTO_VISTA_PERFIL);
    }
  }

  cargarPropio(): Observable<Diseno> {
    return this.http.get<Diseno>(`${this.raiz}/me`).pipe(
      catchError(() => of(VACIO)),
      tap((diseno) => {
        this.propio.set(diseno ?? VACIO);
        void this.aplicarPropio();
      }),
      map((diseno) => diseno ?? VACIO),
    );
  }

  guardar(cambio: Partial<Diseno>): Observable<DisenoGuardado> {
    return this.http.post<DisenoGuardado>(`${this.raiz}/me`, cambio).pipe(
      tap((respuesta) => {
        if (respuesta?.errores?.length) return;
        this.propio.set(this.normalizar(respuesta));
        void this.aplicarPropio();
      }),
    );
  }

  guardarEnLista(clase: ClaseDiseno, nombre: string, diseno: Partial<Diseno>): Observable<DisenoGuardado> {
    return this.http
      .post<DisenoGuardado>(`${this.raiz}/me/guardados`, diseno, {
        params: { clase, nombre },
      })
      .pipe(
        tap((respuesta) => {
          if (respuesta?.errores?.length) return;
          this.propio.set(this.normalizar(respuesta));
        }),
      );
  }

  activarGuardado(id: string): Observable<DisenoGuardado> {
    return this.http.post<DisenoGuardado>(`${this.raiz}/me/guardados/${id}/activar`, {}).pipe(
      tap((respuesta) => {
        if (respuesta?.errores?.length) return;
        this.propio.set(this.normalizar(respuesta));
        void this.aplicarPropio();
      }),
    );
  }

  borrarGuardado(id: string): Observable<DisenoGuardado> {
    return this.http.delete<DisenoGuardado>(`${this.raiz}/me/guardados/${id}`).pipe(
      tap((respuesta) => {
        if (respuesta?.errores?.length) return;
        this.propio.set(this.normalizar(respuesta));
        void this.aplicarPropio();
      }),
    );
  }

  quitar(): Observable<DisenoGuardado> {
    return this.http.delete<DisenoGuardado>(`${this.raiz}/me`).pipe(
      tap(() => {
        this.propio.set(VACIO);
        this.escribir(HOJA_PROPIA, null);
      }),
    );
  }

  cargarDeUsuario(userId: string): Observable<Diseno> {
    return this.http.get<Diseno>(`${this.raiz}/usuario/${userId}`).pipe(
      catchError(() => of(VACIO)),
      map((diseno) => diseno ?? VACIO),
    );
  }

  aplicarAjeno(diseno: Diseno | null): void {
    this.ajeno.set(diseno);
    this.escribirAlcance(diseno, HOJA_AJENA, CLASE_VISITA, this.ajeno);
  }

  aplicarPrevia(diseno: Diseno | null): void {
    this.previa.set(diseno);
    this.escribirAlcance(diseno, HOJA_PREVIA, CLASE_PREVIA, this.previa);
  }

  limpiarAjeno(): void {
    this.ajeno.set(null);
    this.escribir(HOJA_AJENA, null);
  }

  limpiarPrevia(): void {
    this.previa.set(null);
    this.escribir(HOJA_PREVIA, null);
  }

  estaTarjeta(diseno: Diseno): Diseno {
    return {
      acento: diseno.acentoTarjeta ?? diseno.acento,
      secundario: diseno.secundarioTarjeta ?? diseno.secundario,
      fondoUrl: diseno.tarjetaFondoUrl ?? null,
      css: diseno.cssTarjeta ?? diseno.css,
      activo: diseno.activo || Boolean(diseno.tarjetaActivo),
      acentoTarjeta: null,
      secundarioTarjeta: null,
      cssTarjeta: null,
      tarjetaActivo: false,
    };
  }

  private escribirAlcance(
    diseno: Diseno | null,
    hoja: string,
    alcance: string,
    vigente: Signal<Diseno | null>,
  ): void {
    if (!diseno || !diseno.activo) {
      this.escribir(hoja, null);
      return;
    }

    void this.compilar(diseno.css).then((css) => {
      if (vigente() !== diseno) return;

      this.escribir(hoja, this.hojaDelDiseno(diseno, alcance, css));
    });
  }

  private async aplicarPropio(): Promise<void> {
    const diseno = this.propio();

    if (!diseno.activo) {
      this.escribir(HOJA_PROPIA, null);
      return;
    }

    const css = await this.compilar(diseno.css);

    this.escribir(HOJA_PROPIA, this.hojaDelDiseno(diseno, CLASE_VISITA, css));
  }

  /**
   * El diseño es dueño de toda la hoja del perfil: sus variables se escriben sin el prefijo
   * del tema claro (antes el tema del visitante pintaba encima y descuadraba colores y
   * letras) y su CSS se escribe sin envolverlo en ningún `@media`, con el alcance de la
   * vista para no colarse en el perfil de otros.
   */
  private hojaDelDiseno(diseno: Diseno, alcance: string, css: string | null): string {
    const variables = this.bloque(diseno, `.${alcance}`, false, true);

    return [
      variables,
      this.velo(diseno, alcance),
      css ? this.escopar(css, alcance) : '',
      `html[${ATRIBUTO_DISENO}] .perfil-container.${alcance},`
        + ` html[${ATRIBUTO_DISENO}] .tarjeta-page.${alcance} {\n  ${NEUTROS}\n}`,
      NEUTRALIZADO,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private normalizar(diseno: DisenoGuardado): Diseno {
    return {
      acento: diseno.acento ?? null,
      secundario: diseno.secundario ?? null,
      fondoUrl: diseno.fondoUrl ?? null,
      css: diseno.css ?? null,
      activo: Boolean(diseno.activo),
      acentoTarjeta: diseno.acentoTarjeta ?? null,
      secundarioTarjeta: diseno.secundarioTarjeta ?? null,
      cssTarjeta: diseno.cssTarjeta ?? null,
      tarjetaFondoUrl: diseno.tarjetaFondoUrl ?? null,
      tarjetaActivo: Boolean(diseno.tarjetaActivo),
      activoId: diseno.activoId ?? null,
      tarjetaActivoId: diseno.tarjetaActivoId ?? null,
      guardados: diseno.guardados ?? [],
    };
  }

  private bloque(diseno: Diseno, selector: string, claro: boolean, soloClaro = false): string {
    const acento = diseno.acento?.trim();
    const secundario = diseno.secundario?.trim() || acento;

    if (!acento && !secundario && !diseno.fondoUrl) return '';

    const variables: string[] = [];

    if (acento) {
      variables.push(
        `--accent: ${acento};`,
        `--accent-cyan: ${acento};`,
        `--accent-strong: color-mix(in srgb, ${acento} ${claro ? '82%, #000' : '85%, #fff'});`,
        `--accent-soft: color-mix(in srgb, ${acento} 16%, transparent);`,
        `--accent-border: color-mix(in srgb, ${acento} 34%, transparent);`,
        `--border-cyan: color-mix(in srgb, ${acento} 34%, transparent);`,
        `--accent-blue: color-mix(in srgb, ${acento} ${claro ? '85%, #fff' : '70%, #fff'});`,
        `--on-accent: ${this.textoSobre(acento)};`,
      );
    }

    if (secundario) {
      variables.push(
        `--accent-alt: ${secundario};`,
        `--bg-border: color-mix(in srgb, ${secundario} 30%, var(--base-border));`,
        `--border-soft: color-mix(in srgb, ${secundario} 30%, var(--base-border));`,
      );
    }

    // Las superficies se mezclan con la base clara cuando el diseño va sin tema: así el
    // mismo diseño se ve igual con el modo claro y con el oscuro de la app.
    if (secundario || diseno.fondoUrl || soloClaro) {
      for (const [token, matiz, base] of SUPERFICIES) {
        const raiz = soloClaro ? `--base-claro-${base}` : `--base-${base}`;
        variables.push(
          `${token}: ${secundario ? `color-mix(in srgb, ${secundario} ${matiz}%, var(${raiz}))` : `var(${raiz})`};`,
        );
      }
    }

    variables.push(`--fondo-imagen: ${this.urlFondo(diseno.fondoUrl)};`);

    // El texto se recalcula con el tema que toca: sobre superficie clara tiene que
    // ser oscuro, y al revés. Sin esto, el color del tema del visitante no pegaba
    // con la superficie que impone el diseño del dueño.
    variables.push(
      claro
        ? '--text-primary: color-mix(in srgb, #161a1f 88%, var(--accent));'
          + ' --text-secondary: #5a646f; --text-muted: #5a646f; --text-faint: #666f7a;'
        : '--text-primary: color-mix(in srgb, #e6e8ea 92%, var(--accent));'
          + ' --text-secondary: #8b949e; --text-muted: #8b949e; --text-faint: #6e7681;',
    );

    return variables.length ? `${selector} {\n  ${variables.join('\n  ')}\n}` : '';
  }

  private velo(diseno: Diseno, alcance: string): string {
    if (!diseno.fondoUrl) return '';

    const secundario = diseno.secundario?.trim() || diseno.acento?.trim();

    const variables = SUPERFICIES.map(([token, matiz, base, velo]) => {
      const color = secundario
        ? `color-mix(in srgb, ${secundario} ${matiz}%, var(--base-${base}))`
        : `var(--base-${base})`;

      return `${token}: color-mix(in srgb, ${color} ${velo}%, transparent);`;
    });

    return `.${alcance} {\n  ${variables.join('\n  ')}\n}`;
  }

  private urlFondo(url: string | null): string {
    const limpio = (url ?? '').trim();

    if (!/^(https?:\/\/[^\s"'()]+|\/[^\s"'()]*|data:image\/[a-z+.-]+;base64,[a-z0-9+/=]+)$/i.test(limpio)) {
      return 'none';
    }

    return `url("${limpio}")`;
  }

  private async compilar(css: string | null): Promise<string | null> {
    const origen = css?.trim();

    if (!origen) return null;

    if (!/[$@]/.test(origen)) return origen;

    try {
      const modulo = await import('sass');
      const sass = (modulo as unknown as { default?: typeof modulo }).default ?? modulo;
      const resultado = (sass as unknown as { compileString(texto: string): { css: string } }).compileString(origen);
      return resultado.css;
    } catch {
      return origen;
    }
  }

  private escopar(css: string, alcance: string): string {
    if (typeof CSSStyleSheet === 'undefined') return '';

    const hoja = new CSSStyleSheet();

    try {
      hoja.replaceSync(css);
    } catch {
      return '';
    }

    const reglas: string[] = [];

    for (let i = 0; i < hoja.cssRules.length; i++) {
      const regla = hoja.cssRules[i];

      if (!regla) continue;

      reglas.push(this.escoparRegla(regla, alcance));
    }

    return reglas.join('\n');
  }

  private escoparRegla(regla: CSSRule, alcance: string): string {
    const anidada = regla as CSSRule & { cssRules?: CSSRuleList; conditionText?: string };

    if (/^CSS(Media|Supports|Layer|Container)Rule$/.test(regla.constructor.name) && anidada.cssRules) {
      const cabecera = regla.constructor.name === 'CSSMediaRule'
        ? `@media ${anidada.conditionText ?? ''}`
        : regla.constructor.name === 'CSSSupportsRule'
          ? `@supports ${anidada.conditionText ?? ''}`
          : regla.constructor.name === 'CSSLayerRule'
            ? `@layer ${(anidada as { name?: string }).name ?? ''}`
            : `@container ${anidada.conditionText ?? ''}`;

      const dentro: string[] = [];

      for (let i = 0; i < anidada.cssRules.length; i++) {
        const hija = anidada.cssRules[i];
        if (hija) dentro.push(this.escoparRegla(hija, alcance));
      }

      return `${cabecera} {\n${dentro.filter(Boolean).join('\n')}\n}`;
    }

    // Keyframes, font-face y demás reglas de arroba se quedan tal cual.
    if (/^@/.test(regla.cssText)) return regla.cssText;

    const texto = regla.cssText;
    const corte = texto.indexOf('{');

    if (corte < 0) return '';

    const selectores = texto.slice(0, corte).split(',').map((s) => s.trim()).filter(Boolean);
    const cuerpo = texto.slice(corte + 1, -1).trim();

    if (!selectores.length || !cuerpo) return '';

    const prefijados = selectores.map((selector) => this.escoparSelector(selector, alcance)).join(', ');
    return `${prefijados} { ${this.sinCubrir(cuerpo)} }`;
  }

  /**
   * `fixed`/`sticky` tapaban la interfaz global (riel, barra superior, panel de mensajes): un
   * bloque del perfil se quedaba encima y no se podía navegar. Se convierten en `absolute`,
   * que se mueve con la página y solo ocupa el perfil.
   */
  private sinCubrir(cuerpo: string): string {
    return cuerpo.replace(/position\s*:\s*(fixed|sticky)/gi, 'position: absolute');
  }

  private escoparSelector(selector: string, alcance: string): string {
    const limpio = selector.replace(/^(html|body|:root|\.perfil-container|\.tarjeta-page)\b/i, '');

    return `.${alcance}${limpio ? ` ${limpio}` : ''}`;
  }

  /**
   * Un diseño puede traer medidas pensadas para la portada del perfil. Dentro de un avatar
   * rompen el tamaño de cada vista (mensajes, historias, carrusel), así que se descartan.
   *
   * Solo se descartan medidas de tamaño, y solo cuando van en declaraciones completas: antes
   * la expresión cortaba desde cualquier palabra (`margin-top` quedaba en `margin-`,
   * `border-left` en `border-`) y ese texto roto anulaba la regla siguiente, que era justo
   * la que dejaba el avatar centrado sobre la portada.
   */
  private sinMedidas(texto: string): string {
    return texto.replace(MEDIDAS, '$1').replace(/\{\s*\}/g, '{}');
  }

  private escribir(id: string, texto: string | null): void {
    const existente = this.documento.getElementById(id);

    if (!texto) {
      existente?.remove();
      return;
    }

    const hoja = existente ?? this.documento.createElement('style');

    hoja.id = id;
    hoja.textContent = this.sinMedidas(texto);

    if (!existente) {
      this.documento.head.appendChild(hoja);
    }
  }

  /** Pone la marca en <html> para que el tema claro/oscuro no se mezcle con el diseño. */
  private marcarSiFalta(): void {
    if (!this.documento?.documentElement) return;

    const raiz = this.documento.documentElement;
    const hoja = this.documento.getElementById('diseno-marca');
    const debe = this.mandando();

    if (!debe) {
      raiz.removeAttribute(ATRIBUTO_DISENO);
      hoja?.remove();
      return;
    }

    const marca = this.esPropio() ? 'si' : MARCA_DISENO_VISITA;

    if (raiz.getAttribute(ATRIBUTO_DISENO) !== marca) {
      raiz.setAttribute(ATRIBUTO_DISENO, marca);
    }

    if (!hoja) {
      const estilo = this.documento.createElement('style');
      estilo.id = 'diseno-marca';
      // Rinde el tema de la app mientras haya un diseño: ni el claro ni el oscuro pintan
      // encima, y los colores de la interfaz dentro del perfil quedan fijos y legibles.
      estilo.textContent = this.temaNeutro();
      this.documento.head.appendChild(estilo);
    }
  }

  private temaNeutro(): string {
    return [
      `:root[${ATRIBUTO_DISENO}] {`,
      '  color-scheme: light;',
      '  --base-main: #f5f6f8; --base-elevated: #eef0f4; --base-card: #ffffff;',
      '  --base-sidebar: #eef0f4; --base-input: #ffffff; --base-hover: #e7eaef;',
      '  --base-border: #d9dee5;',
      '  --base-claro-main: #f5f6f8; --base-claro-elevated: #eef0f4; --base-claro-card: #ffffff;',
      '  --base-claro-sidebar: #eef0f4; --base-claro-input: #ffffff; --base-claro-hover: #e7eaef;',
      '  --text-primary: #161a1f; --text-secondary: #5a646f; --text-muted: #5a646f;',
      '  --text-faint: #666f7a;',
      '  --bg-navbar: rgba(255, 255, 255, 0.92); --bg-navbar-scrolled: #ffffff;',
      '}',
      `:root[${ATRIBUTO_DISENO}][data-tema='claro'] {`,
      '  --base-main: #f5f6f8; --base-elevated: #eef0f4; --base-card: #ffffff;',
      '  --base-sidebar: #eef0f4; --base-input: #ffffff; --base-hover: #e7eaef;',
      '  --base-border: #d9dee5;',
      '  --text-primary: #161a1f; --text-secondary: #5a646f; --text-muted: #5a646f;',
      '  --text-faint: #666f7a;',
      '}',
    ].join('\n');
  }

  private textoSobre(color: string): string {
    const rgb = this.aRgb(color);

    if (!rgb) return '#08090b';

    const lineal = rgb.map((canal) => {
      const v = canal / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });

    const luminancia = 0.2126 * lineal[0] + 0.7152 * lineal[1] + 0.0722 * lineal[2];

    return luminancia > 0.4 ? '#08090b' : '#ffffff';
  }

  private aRgb(color: string): [number, number, number] | null {
    const hex = color.trim();
    const corto = /^#([0-9a-f]{3,4})$/i.exec(hex);

    if (corto) {
      const digitos = corto[1];
      return [
        parseInt(digitos[0] + digitos[0], 16),
        parseInt(digitos[1] + digitos[1], 16),
        parseInt(digitos[2] + digitos[2], 16),
      ];
    }

    const largo = /^#([0-9a-f]{6}|[0-9a-f]{8})$/i.exec(hex);

    if (largo) {
      const cuerpo = largo[1];
      return [
        parseInt(cuerpo.slice(0, 2), 16),
        parseInt(cuerpo.slice(2, 4), 16),
        parseInt(cuerpo.slice(4, 6), 16),
      ];
    }

    const funcion = /^rgba?\(\s*(\d{1,3})[,\s]+(\d{1,3})[,\s]+(\d{1,3})/i.exec(hex);

    if (funcion) {
      return [Number(funcion[1]), Number(funcion[2]), Number(funcion[3])];
    }

    return null;
  }
}
