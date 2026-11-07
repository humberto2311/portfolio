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
  tarjetaActivo?: boolean;
}

export interface DisenoGuardado extends Diseno {
  errores?: string[];
}

const VACIO: Diseno = {
  acento: null,
  secundario: null,
  fondoUrl: null,
  css: null,
  activo: false,
  acentoTarjeta: null,
  secundarioTarjeta: null,
  cssTarjeta: null,
  tarjetaActivo: false,
};
const HOJA_PROPIA = 'diseno-propio';
const HOJA_AJENA = 'diseno-ajeno';
const HOJA_PREVIA = 'diseno-previa-tarjeta';
export const CLASE_VISITA = 'diseno-visita';
export const CLASE_PREVIA = 'diseno-previa';

const SUPERFICIES: [string, number, string, number][] = [
  ['--bg-main', 7, 'main', 92],
  ['--bg-elevated', 14, 'elevated', 86],
  ['--bg-card', 10, 'card', 82],
  ['--bg-sidebar', 11, 'sidebar', 86],
  ['--bg-input', 6, 'input', 90],
  ['--bg-hover', 20, 'hover', 78],
];

@Injectable({ providedIn: 'root' })
export class DisenoService {
  private readonly http = inject(HttpClient);
  private readonly documento = inject(DOCUMENT);
  private readonly raiz = `${environment.apiUrl}/api/users/diseno`;

  readonly propio = signal<Diseno>(VACIO);
  readonly ajeno = signal<Diseno | null>(null);
  readonly previa = signal<Diseno | null>(null);

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
      fondoUrl: diseno.fondoUrl,
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

      const texto = [
        this.bloque(diseno, `.${alcance}`, false),
        this.bloque(diseno, `[data-tema='claro'] .${alcance}`, true),
        this.velo(diseno, alcance),
        css ? this.escopar(css, alcance) : '',
      ]
        .filter(Boolean)
        .join('\n');

      this.escribir(hoja, texto);
    });
  }

  private async aplicarPropio(): Promise<void> {
    const diseno = this.propio();

    if (!diseno.activo) {
      this.escribir(HOJA_PROPIA, null);
      return;
    }

    const css = await this.compilar(diseno.css);

    const texto = [
      this.bloque(diseno, ':root', false),
      this.bloque(diseno, ":root[data-tema='claro']", true),
      this.velo(diseno, CLASE_VISITA),
      css ?? '',
    ]
      .filter(Boolean)
      .join('\n');

    this.escribir(HOJA_PROPIA, texto);
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
      tarjetaActivo: Boolean(diseno.tarjetaActivo),
    };
  }

  private bloque(diseno: Diseno, selector: string, claro: boolean): string {
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

    if (secundario || diseno.fondoUrl) {
      for (const [token, matiz, base] of SUPERFICIES) {
        variables.push(
          `${token}: ${secundario ? `color-mix(in srgb, ${secundario} ${matiz}%, var(--base-${base}))` : `var(--base-${base})`};`,
        );
      }
    }

    variables.push(`--fondo-imagen: ${this.urlFondo(diseno.fondoUrl)};`);

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

    return Array.from(hoja.cssRules).map((regla) => this.escoparRegla(regla.cssText, alcance)).join('\n');
  }

  private escoparRegla(texto: string, alcance: string): string {
    const soporte = /^@(supports|media)\b/i.exec(texto);

    if (!soporte) {
      if (/^@/.test(texto)) return texto;

      const corte = texto.indexOf('{');
      if (corte < 0) return '';

      const selectores = texto.slice(0, corte).split(',').map((s) => s.trim()).filter(Boolean);
      const cuerpo = texto.slice(corte + 1, -1).trim();

      if (!selectores.length || !cuerpo) return '';

      const prefijados = selectores.map((selector) => this.escoparSelector(selector, alcance)).join(', ');
      return `${prefijados} { ${cuerpo.replace(/position:\s*fixed/gi, 'position: absolute')} }`;
    }

    const cabecera = texto.slice(0, soporte[0].length);
    const resto = texto.slice(soporte[0].length);
    const apertura = resto.indexOf('{');
    const interior = resto.slice(apertura + 1, resto.lastIndexOf('}'));

    const reglasInternas = this.dividirReglas(interior)
      .map((fragmento) => this.escoparRegla(fragmento, alcance))
      .filter(Boolean)
      .join('\n');

    return `${cabecera} { ${reglasInternas} }`;
  }

  private escoparSelector(selector: string, alcance: string): string {
    const limpio = selector.replace(/^(html|body|:root|\.perfil-container|\.tarjeta-page)\b/i, '');

    return `.${alcance}${limpio ? ` ${limpio}` : ''}`;
  }

  private dividirReglas(texto: string): string[] {
    const reglas: string[] = [];
    let profundidad = 0;
    let actual = '';

    for (const caracter of texto) {
      if (caracter === '{') profundidad++;

      if (caracter === '}' && profundidad > 0) {
        profundidad--;
        actual += caracter;
        if (profundidad === 0) {
          reglas.push(actual.trim());
          actual = '';
          continue;
        }
        continue;
      }

      actual += caracter;
    }

    return reglas;
  }

  private escribir(id: string, texto: string | null): void {
    const existente = this.documento.getElementById(id);

    if (!texto) {
      existente?.remove();
      return;
    }

    const hoja = existente ?? this.documento.createElement('style');

    hoja.id = id;
    hoja.textContent = texto;

    if (!existente) {
      this.documento.head.appendChild(hoja);
    }
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
