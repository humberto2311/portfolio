import {
  ComponentRef,
  Directive,
  ElementRef,
  HostListener,
  OnDestroy,
  Renderer2,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { SugerenciaUsuario, UserDirectoryService } from '../../core/services/user-directory.service';
import { MencionesPanelComponent } from '../components/menciones-panel/menciones-panel.component';

type Campo = HTMLInputElement | HTMLTextAreaElement;

@Directive({ selector: '[appMenciones]', standalone: true })
export class MencionesDirective implements OnDestroy {
  private campo = inject<ElementRef<Campo>>(ElementRef).nativeElement;
  private contenedor = inject(ViewContainerRef);
  private render = inject(Renderer2);
  private directorio = inject(UserDirectoryService);

  private panel?: ComponentRef<MencionesPanelComponent>;
  private alDesplazar?: () => void;
  private sugerencias: SugerenciaUsuario[] = [];
  private indice = 0;
  private tokenInicio = -1;
  private requestId = 0;

  private get abierta(): boolean {
    return !!this.panel && this.sugerencias.length > 0;
  }

  @HostListener('input')
  alEscribir(): void {
    const valor = this.campo.value;
    const cursor = this.campo.selectionStart ?? valor.length;
    const match = /(?:^|[\s(])@([\w.\-]*)$/.exec(valor.slice(0, cursor));

    if (!match) {
      this.cerrar();
      return;
    }

    this.tokenInicio = cursor - match[1].length - 1;
    const id = ++this.requestId;

    this.directorio.buscar(match[1], 8).subscribe({
      next: (lista) => {
        if (id === this.requestId) this.mostrar(lista);
      },
      error: () => this.cerrar(),
    });
  }

  @HostListener('keydown', ['$event'])
  alPulsar(event: KeyboardEvent): void {
    if (!this.abierta) return;

    const total = this.sugerencias.length;

    if (event.key === 'ArrowDown') {
      this.mover((this.indice + 1) % total, event);
    } else if (event.key === 'ArrowUp') {
      this.mover((this.indice - 1 + total) % total, event);
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.insertar(this.sugerencias[this.indice]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      this.cerrar();
    }
  }

  @HostListener('blur')
  alPerderFoco(): void {
    this.cerrar();
  }

  ngOnDestroy(): void {
    this.cerrar();
  }

  private mover(indice: number, event: KeyboardEvent): void {
    event.preventDefault();
    event.stopImmediatePropagation();
    this.indice = indice;
    this.sincronizar();
  }

  private mostrar(lista: SugerenciaUsuario[]): void {
    if (lista.length === 0) {
      this.cerrar();
      return;
    }

    this.sugerencias = lista;
    this.indice = 0;
    this.asegurarPanel();
    this.sincronizar();
    this.posicionar();
  }

  private asegurarPanel(): void {
    if (this.panel) return;

    this.panel = this.contenedor.createComponent(MencionesPanelComponent);
    this.panel.instance.elegido.subscribe((s) => this.insertar(s));
    this.panel.instance.activoHover.subscribe((i) => {
      this.indice = i;
      this.sincronizar();
    });
    this.alDesplazar = this.render.listen('window', 'resize', () => this.cerrar());
  }

  private sincronizar(): void {
    if (!this.panel) return;
    this.panel.setInput('sugerencias', this.sugerencias);
    this.panel.setInput('activo', this.indice);
  }

  private posicionar(): void {
    const nodo = this.panel?.location.nativeElement as HTMLElement | undefined;
    if (!nodo) return;

    const caja = this.campo.getBoundingClientRect();
    const ancho = Math.min(Math.max(caja.width, 220), 340);

    nodo.style.width = `${ancho}px`;
    nodo.style.left = `${Math.min(caja.left, window.innerWidth - ancho - 8)}px`;

    if (window.innerHeight - caja.bottom < 180 && caja.top > 240) {
      nodo.style.bottom = `${window.innerHeight - caja.top + 6}px`;
      nodo.style.top = '';
    } else {
      nodo.style.top = `${caja.bottom + 6}px`;
      nodo.style.bottom = '';
    }
  }

  private cerrar(): void {
    this.panel?.destroy();
    this.panel = undefined;
    this.alDesplazar?.();
    this.alDesplazar = undefined;
    this.sugerencias = [];
    this.tokenInicio = -1;
  }

  private insertar(sugerencia: SugerenciaUsuario): void {
    if (!sugerencia || this.tokenInicio < 0) return;

    const valor = this.campo.value;
    const antes = valor.slice(0, this.tokenInicio);
    const resto = valor
      .slice(this.tokenInicio)
      .replace(/^@[\w.\-]*/, '')
      .replace(/^\s+/, '');
    const texto = `${antes}@${sugerencia.username} ${resto}`;
    const cursor = (antes + `@${sugerencia.username} `).length;

    this.campo.value = texto;
    this.cerrar();
    this.campo.dispatchEvent(new Event('input', { bubbles: true }));

    requestAnimationFrame(() => {
      this.campo.focus();
      this.campo.setSelectionRange(cursor, cursor);
    });
  }
}
