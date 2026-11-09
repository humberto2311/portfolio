import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import {
  ComponenteLienzo,
  ContenidoBoton,
  ContenidoContacto,
  ContenidoGaleria,
  ContenidoHorario,
  ContenidoHtml,
  ContenidoImagen,
  ContenidoLista,
  ContenidoMenu,
  ContenidoProducto,
  ContenidoTexto,
  EstiloComponente,
  MenuGrupo,
} from '../../../core/models/empresa.model';
import { FUENTES, leerJson } from '../empresa-ui';

/** Se llama una vez por diseño: describe el iframe en la consola para diagnosticar marcos en blanco. */
function trazarMarco(unico: string, documento: string): void {
  if (typeof console === 'undefined') return;
  console.debug('[HTML lienzo]', unico, 'caracteres:', documento.length, documento.slice(0, 120));
}

@Component({
  selector: 'app-empresa-componente-vista',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './empresa-componente-vista.component.html',
  styleUrls: ['./empresa-componente-vista.component.scss'],
})
export class EmpresaComponenteVistaComponent implements OnChanges {
  @Input({ required: true }) componente!: ComponenteLienzo;
  @Input() modo: 'publico' | 'editor' = 'publico';

  readonly grupoActivo = signal(0);

  @ViewChild('marcoHtml') marcoHtml?: ElementRef<HTMLIFrameElement>;
  @ViewChild('anfitrion') anfitrion?: ElementRef<HTMLElement>;

  private sanitizer = inject(DomSanitizer);

  /** Pintado directo en Shadow DOM: sin iframe, sin CSP ni sandbox de por medio. */
  readonly usarRespaldo = signal(true);
  private sombra?: ShadowRoot;
  private intentosEscritura = 0;
  /** Recargas permitidas del marco antes de rendirse con el iframe (evita el bucle de peticiones). */
  private recargas = 0;
  private static readonly MAX_RECARGAS = 2;

  /** Sin permisos: el HTML corre aislado y no puede tocar la sesión ni navegar la página. */
  readonly arenaPublica = 'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms';
  /** En el editor se suma el mismo origen para que el iframe pueda medir su altura. */
  readonly arenaEditor = `${this.arenaPublica} allow-same-origin`;
  /**
   * Arena amplia: permite scripts, formularios y el mismo origen. Sin same-origin el navegador
   * bloquea estilos/subrecursos y el marco queda en blanco; el aislamiento real lo da la CSP
   * y el hecho de que el HTML no puede tocar la app (documento separado, sin acceso a cookies de sesión).
   */
  readonly arenaAmplia = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms';

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['componente']) {
      // El iframe a veces no repinta un srcdoc igual a igual: se fuerza al cambiar el contenido.
      const antes = cambios['componente'].previousValue as ComponenteLienzo | undefined;
      if (antes?.contenido !== this.componente?.contenido && this.componente?.tipo === 'HTML') {
        setTimeout(() => this.repintarHtml(), 0);
      }

      if (this.componente?.tipo === 'HTML') {
        setTimeout(() => this.pintarSombra(), 0);
      }

      const anterior = cambios['componente'].previousValue as ComponenteLienzo | undefined;
      if (!anterior || anterior.id !== this.componente?.id) this.grupoActivo.set(0);
    }
  }

  get estilo(): EstiloComponente {
    return leerJson<EstiloComponente>(this.componente?.estilo, {});
  }

  get texto(): ContenidoTexto {
    return leerJson<ContenidoTexto>(this.componente?.contenido, { texto: '' });
  }

  get imagen(): ContenidoImagen {
    return leerJson<ContenidoImagen>(this.componente?.contenido, { url: '' });
  }

  get boton(): ContenidoBoton {
    return leerJson<ContenidoBoton>(this.componente?.contenido, { texto: '' });
  }

  get lista(): ContenidoLista {
    return leerJson<ContenidoLista>(this.componente?.contenido, { items: [] });
  }

  get menu(): ContenidoMenu {
    return leerJson<ContenidoMenu>(this.componente?.contenido, { grupos: [] });
  }

  get producto(): ContenidoProducto {
    return leerJson<ContenidoProducto>(this.componente?.contenido, { nombre: '' });
  }

  get galeria(): ContenidoGaleria {
    return leerJson<ContenidoGaleria>(this.componente?.contenido, { imagenes: [] });
  }

  get contacto(): ContenidoContacto {
    return leerJson<ContenidoContacto>(this.componente?.contenido, {});
  }

  get horario(): ContenidoHorario {
    return leerJson<ContenidoHorario>(this.componente?.contenido, { filas: [] });
  }

  get htmlContenido(): ContenidoHtml {
    const contenido = leerJson<ContenidoHtml>(this.componente?.contenido, { html: '' });

    // Si el HTML se guardó escapado (\n, \"), se desescapa para que el marco lo dibuje.
    return { ...contenido, html: desescapar(contenido?.html ?? '') };
  }

  /**
   * Documento listo para el iframe. La CSP viaja dentro del propio HTML porque en un
   * srcdoc el sandbox basta para aislar, y la política frena cargas externas raras.
   */
  /**
   * Escribe el documento dentro del iframe en lugar de usar srcdoc.
   * srcdoc hereda la CSP de la app y en varios navegadores deja el marco en blanco;
   * document.write sobre un marco del mismo origen pinta siempre el HTML tal cual.
   */
  alCargarMarco(evento?: Event): void {
    // Solo eventos reales del iframe: leer contentDocument en cada ciclo de detección causaba
    // recargas en bucle y miles de peticiones al backend.
    const objetivo = evento?.target as HTMLIFrameElement | undefined;

    if (!objetivo || objetivo.tagName !== 'IFRAME') return;

    // En la primera carga del navegador se espera un instante: escribir dentro del iframe
    // durante la hidratación dispara recargas y peticiones en bucle.
    const demora = this.recargas === 0 ? 120 : 0;
    this.recargas += 1;

    setTimeout(() => this.escribirEnMarco(0, objetivo), demora);
  }

  /**
   * Escribe el documento dentro del iframe. Se hace en cada carga del marco (también en la
   * segunda vuelta del bucle src → load), porque el primer load puede ganar la carrera y quedar vacío.
   */
  private escribirEnMarco(intentos = 0, marcoRef?: HTMLIFrameElement): void {
    const marco = marcoRef ?? this.marcoHtml?.nativeElement;
    if (!marco) return;

    const documento = limpiarEnCliente(this.htmlSeguro);
    if (!documento) return;

    try {
      const interno = marco.contentDocument;

      if (!interno) {
        console.warn('[HTML lienzo] el marco no expone su documento (sandbox).');

        if (intentos < 3) {
          setTimeout(() => this.escribirEnMarco(intentos + 1, marco), 60 * (intentos + 1));
        } else {
          this.usarRespaldo.set(true);
        }
        return;
      }

      const cuerpo = interno.body;
      const yaEscrito = (cuerpo?.childElementCount ?? 0) > 0;

      if (yaEscrito) {
        this.intentosEscritura = 0;
        return;
      }

      // El marco volvió a quedar vacío sin que nosotros lo pidiéramos: se corta el bucle.
      if (this.recargas >= EmpresaComponenteVistaComponent.MAX_RECARGAS) {
        this.usarRespaldo.set(true);
        return;
      }

      this.recargas += 1;

      interno.open();
      interno.write(documento);
      interno.close();
    } catch (error) {
      console.warn('[HTML lienzo] no se pudo escribir en el marco:', error);

      if (intentos < 3) {
        setTimeout(() => this.escribirEnMarco(intentos + 1, marco), 60 * (intentos + 1));
        return;
      }

      // Tres fallos seguidos: el iframe no sirve en este navegador/contexto, se pinta en Shadow DOM.
      this.usarRespaldo.set(true);
    }
  }

  /** Reasigna el srcdoc para que el marco vuelva a dibujar el documento. */
  private repintarHtml(): void {
    const marco = this.marcoHtml?.nativeElement;
    if (!marco) return;

    trazarMarco('repintar', this.htmlSeguro);
    this.escribirEnMarco();
  }

  /** Diagnóstico visible desde el lienzo: qué se está pintando de verdad. */
  get resumenHtml(): string {
    const codigo = (this.htmlContenido.html ?? '').trim();
    if (!codigo) return 'HTML vacío';
    return `${codigo.length} caracteres · ${codigo.slice(0, 60).replace(/\s+/g, ' ')}…`;
  }

  /**
   * Origen para el primer load del marco. Angular exige un ResourceUrl seguro para [src]
   * de un iframe (NG0904), por eso se marca como confiable: es una ruta fija del propio sitio.
   */
  get htmlSrc(): SafeResourceUrl {
    // about:blank no depende de que exista un archivo en el servidor: el 404 salía por /html-vacio.html.
    return this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
  }

  /**
   * Respaldo sin iframe: el mismo HTML pero dentro de un contenedor aislado, con el CSS del
   * documento movido a un <style> propio para que conserve su diseño.
   */
  /**
   * Pinta el HTML dentro de un ShadowRoot: el CSS del documento queda encapsulado,
   * no afecta a la app y se puede controlar que no haya scripts.
   */
  private pintarSombra(): void {
    if (typeof document === 'undefined') return;

    const anfitrion = this.anfitrion?.nativeElement;
    if (!anfitrion) return;

    if (!this.sombra) {
      this.sombra = anfitrion.attachShadow({ mode: 'open' });
    }

    const html = this.htmlRespaldo;
    const estilosExtra = `
      :host { display: block; width: 100%; height: 100%; overflow: auto; background: #fff; }
      img { max-width: 100%; height: auto; }
      table { width: 100%; border-collapse: collapse; }
    `;

    this.sombra.innerHTML = `<style>${estilosExtra}</style>${html}`;
  }

  get htmlRespaldo(): string {
    const original = limpiarEnCliente(this.htmlContenido?.html ?? '');
    if (!original) return '';

    const estilos: string[] = [];
    let cuerpo = original;

    cuerpo = cuerpo.replace(/<link[^>]*rel=["']?stylesheet["']?[^>]*>/gi, '');
    cuerpo = cuerpo.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_todo, css: string) => {
      estilos.push(css);
      return '';
    });

    // Se queda solo con el contenido del body si el documento lo trae.
    const interior = /<body[^>]*>([\s\S]*)<\/body>/i.exec(cuerpo);
    if (interior) cuerpo = interior[1];

    cuerpo = cuerpo.replace(/<m(?:eta|title)\b[^>]*>[\s\S]*?<\/title\s*>/gi, '');
    cuerpo = cuerpo.replace(/<\/?\s*(?:html|head|body|title|meta|link)\b[^>]*>/gi, '');

    return (estilos.length ? `<style>${estilos.join('\n')}</style>` : '') + cuerpo;
  }

  /** 'cubrir' por defecto: el documento llena la pieza; 'seccion' solo ocupa su contenido. */
  get ajusteHtml(): 'cubrir' | 'seccion' {
    return this.htmlContenido.ajuste === 'seccion' ? 'seccion' : 'cubrir';
  }

  get marcoEstilosHtml(): Record<string, string> {
    return this.ajusteHtml === 'seccion'
      ? { height: 'auto', 'min-height': '0' }
      : { height: '100%' };
  }

  get htmlSeguro(): string {
    const codigo = (this.htmlContenido.html ?? '').trim();

    if (!codigo) {
      return '<!doctype html><html><body style="font-family:system-ui;display:grid;place-items:center;height:100%;color:#64748b">HTML interactivo vacío</body></html>';
    }

    const politica = [
      "default-src * data: blob:",
      "img-src * data: blob:",
      "style-src * 'unsafe-inline'",
      "font-src * data:",
      "script-src 'unsafe-inline' 'unsafe-eval' https:",
      "media-src * data: blob:",
      "connect-src http://localhost:* http://127.0.0.1:* https:",
      "form-action 'none'",
      "base-uri 'none'",
    ].join('; ');

    const meta = `<meta http-equiv="Content-Security-Policy" content="${politica}">`;

    // Un fragmento (sin <html>) se envuelve: al pegar sin el doctype no queda una página en blanco.
    const tieneDocumento = /<html[\s>]/i.test(codigo) || /<body[\s>]/i.test(codigo);

    if (!tieneDocumento) {
      return `<!doctype html><html><head>${meta}</head><body>${codigo}</body></html>`;
    }

    if (/<head[^>]*>/i.test(codigo)) {
      return codigo.replace(/<head([^>]*)>/i, `<head$1>${meta}`);
    }

    if (/<html[^>]*>/i.test(codigo)) {
      return codigo.replace(/<html([^>]*)>/i, `<html$1><head>${meta}</head>`);
    }

    return `<!doctype html><html><head>${meta}</head><body>${codigo}</body></html>`;
  }

  get esMedia(): boolean {
    return this.componente?.tipo === 'IMAGEN';
  }

  get marcoEstilo(): Record<string, string | number> {
    const estilo = this.estilo;
    const valores: Record<string, string | number> = {
      'border-radius': `${estilo.radio ?? 12}px`,
      opacity: estilo.opacidad ?? 1,
    };

    if (estilo.fondo) valores['background'] = estilo.fondo;
    if (estilo.borde) valores['border'] = estilo.borde;
    if (estilo.sombra) valores['box-shadow'] = '0 18px 38px rgba(15, 23, 42, .22)';

    return valores;
  }

  get tituloEstilo(): Record<string, string | number> {
    const estilo = this.estilo;
    return {
      color: estilo.color ?? '#111827',
      'font-family': estilo.fuente ?? FUENTES[0].valor,
      'font-weight': estilo.peso ?? 700,
      'text-align': estilo.alineacion ?? 'left',
      'letter-spacing': estilo.espaciado ? `${estilo.espaciado}px` : 'normal',
    };
  }

  get textEstilo(): Record<string, string | number> {
    const estilo = this.estilo;
    const contenido = this.texto;
    return {
      color: contenido.color ?? estilo.color ?? '#111827',
      'font-family': estilo.fuente ?? FUENTES[0].valor,
      'font-size': `${contenido.tamano ?? estilo.tamano ?? 22}px`,
      'font-weight': contenido.peso ?? estilo.peso ?? 500,
      'text-align': contenido.alineacion ?? estilo.alineacion ?? 'left',
      'letter-spacing': estilo.espaciado ? `${estilo.espaciado}px` : 'normal',
      'line-height': 1.45,
    };
  }

  get cuerpoEstilo(): Record<string, string | number> {
    const estilo = this.estilo;
    return {
      color: estilo.color ?? '#334155',
      'font-family': estilo.fuente ?? FUENTES[0].valor,
      'text-align': estilo.alineacion ?? 'left',
      'letter-spacing': estilo.espaciado ? `${estilo.espaciado}px` : 'normal',
    };
  }

  get botonEstilo(): Record<string, string | number> {
    const estilo = this.estilo;
    const contenido = this.boton;
    return {
      'background': contenido.color ?? estilo.fondo ?? '#2563eb',
      'color': estilo.color ?? '#ffffff',
      'border-radius': `${estilo.radio ?? 12}px`,
      'font-family': estilo.fuente ?? FUENTES[0].valor,
      'font-weight': estilo.peso ?? 700,
    };
  }

  get grupoActivoDatos(): MenuGrupo | null {
    const grupos = this.menu.grupos ?? [];
    return grupos[this.grupoActivo()] ?? grupos[0] ?? null;
  }

  elegirGrupo(indice: number): void {
    this.grupoActivo.set(indice);
  }

  imagenesValidas(imagenes: string[] | null | undefined): string[] {
    return (imagenes ?? []).filter((url) => Boolean(url && url.trim()));
  }

  enlace(valor: string | null | undefined): string {
    const limpio = (valor ?? '').trim();
    if (!limpio || limpio === '#') return '#';
    if (/^(https?:|mailto:|tel:)/i.test(limpio)) return limpio;
    if (/^www\./i.test(limpio)) return `https://${limpio}`;
    return limpio.startsWith('/') ? limpio : '#';
  }

  enlaceImagen(valor: string | null | undefined): string {
    const limpio = (valor ?? '').trim();
    return /^(https?:\/\/|data:image\/)/i.test(limpio) ? limpio : '';
  }

  enlaceTelefono(valor: string | null | undefined): string {
    const limpio = (valor ?? '').replace(/[^\d+]/g, '');
    return limpio ? `tel:${limpio}` : '#';
  }

  enlaceCorreo(valor: string | null | undefined): string {
    const limpio = (valor ?? '').trim();
    return limpio ? `mailto:${limpio}` : '#';
  }

  enlaceWhatsapp(valor: string | null | undefined): string {
    const limpio = (valor ?? '').replace(/[^\d]/g, '');
    return limpio ? `https://wa.me/${limpio}` : '#';
  }

  textoContacto(valor: string | null | undefined): string {
    return (valor ?? '').trim();
  }
}

/**
 * Repara HTML que quedó guardado con las secuencias escapadas (\n → salto real, \" → comilla).
 * Sin esto un documento escapado se pinta como texto plano y el marco sale en blanco.
 */
function desescapar(valor: string): string {
  if (!valor || !/\\n|\\r|\\t|\\"|\\'/.test(valor)) return valor;

  return valor
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');
}

/** Última barrera en el navegador: fuera scripts, manejadores on* y URLs javascript: del HTML. */
function limpiarEnCliente(html: string): string {
  if (!html) return '';

  return html
    .replace(/<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*script\b[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, '');
}
