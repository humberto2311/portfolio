import { Component, Input } from '@angular/core';

/**
 * Marca NFSocial.
 *
 * La esencia está en el centro: **"so"** dibujado como una sola pieza de trazo
 * grueso — un aro abierto dentro del cual la banda entra, se enrosca y vuelve a
 * salir. Ese bloque es a la vez la "s" de NFS y la "o" de Social.
 *
 *   NF  +  [ so ]  +  cial   →   NFSocial
 *
 * - "NF" y "cial" son texto y van siempre visibles: la marca se lee completa en
 *   el riel, en la barra y en el pie.
 * - Todos los colores salen de los tokens de la app (--accent, --text-primary),
 *   así que el logo sigue la tonalidad del sitio. El trazo no depende del fondo:
 *   no hay cortes pintados con el color de fondo, así que no se rompe al cambiar
 *   de tema ni al ponerlo sobre una tarjeta.
 */
@Component({
  selector: 'app-logo',
  standalone: true,
  template: `
    <svg
      class="logo__marca"
      viewBox="0 0 132 40"
      role="img"
      aria-label="NFSocial"
      [style.height.px]="alto"
      focusable="false">
      <!-- NF: el lado firme de la marca -->
      <text class="logo__nf" x="0" y="29" font-size="25" font-weight="800" letter-spacing="-1.2">NF</text>

      <!-- El bloque "so": aro abierto + banda que se enrosca dentro y sale -->
      <g class="logo__so" transform="translate(48 20) scale(0.145)">
        <!-- la o: aro abierto, la banda entra y sale por ese corte -->
        <path class="logo__aro" d="M 178 62 A 78 78 0 1 0 178 138" transform="translate(-100 -100)" />

        <!-- la s: banda que entra, se enrosca y sale como cola abajo -->
        <path
          class="logo__s"
          d="M 172 70 H 94 A 28 28 0 0 0 94 126 H 110 A 28 28 0 0 1 110 182 H 26"
          transform="translate(-100 -100)" />
      </g>

      @if (nombre) {
        <text class="logo__cial" x="71" y="29" font-size="25" font-weight="700" letter-spacing="-0.9">cial</text>
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      color: inherit;
      min-width: 0;
    }

    .logo__marca {
      display: block;
      width: auto;
      max-width: 100%;
      flex-shrink: 0;
      overflow: visible;
    }

    .logo__nf,
    .logo__cial {
      font-family: var(--font-main, system-ui, sans-serif);
      fill: var(--text-primary);
    }

    /* "cial" se apoya en el aro: sin aire entre las dos partes. */
    .logo__cial {
      opacity: 0.92;
    }

    /* El trazo de la marca: una sola pieza, mismo color y remates redondos. */
    .logo__aro,
    .logo__s {
      fill: none;
      stroke: var(--accent);
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .logo__aro {
      stroke-width: 22;
    }

    /* La s: la banda protagonista, algo más gruesa que el aro. */
    .logo__s {
      stroke-width: 26;
    }

    /* La marca "emite": el trazo respira al pasar el ratón. */
    @media (prefers-reduced-motion: no-preference) {
      :host(:hover) .logo__so {
        animation: emitir 2s ease-in-out infinite;
      }
    }

    @keyframes emitir {
      0%, 100% { opacity: 0.78; }
      50%      { opacity: 1; }
    }
  `,
})
export class LogoComponent {
  /** Alto en píxeles del logo completo. */
  @Input() alto = 26;

  /** ¿Se escriben "NF" y "cial" alrededor del bloque "so"? */
  @Input() nombre = true;
}
