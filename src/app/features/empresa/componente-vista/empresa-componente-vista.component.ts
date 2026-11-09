import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, signal } from '@angular/core';

import {
  ComponenteLienzo,
  ContenidoBoton,
  ContenidoContacto,
  ContenidoGaleria,
  ContenidoHorario,
  ContenidoImagen,
  ContenidoLista,
  ContenidoMenu,
  ContenidoProducto,
  ContenidoTexto,
  EstiloComponente,
  MenuGrupo,
} from '../../../core/models/empresa.model';
import { FUENTES, leerJson } from '../empresa-ui';

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

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['componente']) {
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
