import { Component, Input } from '@angular/core';

/**
 * Marca NFSocial.
 *
 * El monograma es el dibujo original de la marca (aro abierto con la N y la S
 * dentro), servido desde `assets/images/logo-monograma.png`, y se tiñe con el
 * color de acento vigente. Así acompaña los cambios de tema y el color que el
 * usuario elija: el PNG va dentro de una máscara y lo que se ve es el color del
 * token, no el turquesa del archivo.
 *
 *   [ monograma ]  +  Social
 *
 * - `partes` decide cómo se escribe la marca:
 *     · `completo`       → monograma + "Social".
 *     · `soloMonograma`  → solo el dibujo (riel colapsado).
 * - El texto y el monograma salen de `--accent` / `--text-primary`, nunca de un
 *   color fijo, para que sigan el tema claro/oscuro y el color propio.
 * - `alto` es la altura del conjunto; el monograma ocupa esa altura.
 */
@Component({
  selector: 'app-logo',
  standalone: true,
  template: `
    <span class="logo" [style.height.px]="alto" [style.--alto-logo]="alto">
      <span class="logo__monograma" role="presentation" aria-hidden="true"></span>
      @if (partes === 'completo') {
        <span class="logo__texto" aria-hidden="true">Social</span>
      }
      <span class="logo__oculto">NFSocial</span>
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      color: inherit;
      min-width: 0;
    }

    .logo {
      display: inline-flex;
      align-items: center;
      gap: 0.34em;
      min-width: 0;
    }

    /* El PNG solo aporta la forma: el color lo pone el acento. */
    .logo__monograma {
      display: block;
      height: 100%;
      aspect-ratio: 335 / 339;
      flex-shrink: 0;
      background: linear-gradient(
        150deg,
        color-mix(in srgb, var(--accent) 58%, #ffffff) 0%,
        var(--accent) 46%,
        color-mix(in srgb, var(--accent) 76%, #00131a) 100%
      );
      -webkit-mask-image: url('/assets/images/logo-monograma.png');
      mask-image: url('/assets/images/logo-monograma.png');
      -webkit-mask-size: contain;
      mask-size: contain;
      -webkit-mask-repeat: no-repeat;
      mask-repeat: no-repeat;
      -webkit-mask-position: center;
      mask-position: center;
    }

    .logo__texto {
      display: inline-flex;
      align-items: baseline;
      white-space: nowrap;
      font-family: var(--font-main, system-ui, sans-serif);
      font-size: calc(var(--alto-logo, 26) * 0.62);
      letter-spacing: -0.03em;
      line-height: 1;
      color: var(--text-primary);
      font-weight: 700;
    }

    .logo__oculto {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  `,
})
export class LogoComponent {
  /** Alto en píxeles del logo completo. */
  @Input() alto = 26;

  /** `completo` escribe la marca; `soloMonograma` deja solo el dibujo. */
  @Input() partes: 'completo' | 'soloMonograma' = 'completo';

  /** Atajo de antes: false equivale a `soloMonograma`. */
  @Input() set nombre(valor: boolean) {
    this.partes = valor ? 'completo' : 'soloMonograma';
  }
}
