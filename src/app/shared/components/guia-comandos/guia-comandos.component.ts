import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CategoriaComando, ComandoDefinicion } from '../../../core/models/comando.model';
import { ComandosService } from '../../../core/services/comandos.service';

interface GrupoComandos {
  categoria: CategoriaComando;
  comandos: ComandoDefinicion[];
}

/** A qué bot (los "bots" de commands.json) pertenece cada categoría del catálogo. */
const BOT_POR_CATEGORIA: Record<string, string> = {
  calendar: 'google',
  sheets: 'google',
  docs: 'google',
  drive: 'google',
  gmail: 'google',
  github: 'github',
  equipos: 'red',
  grupos: 'red',
  youtube: 'youtube',
  networking: 'negocios',
  nfc: 'negocios'
};

const BOT_POR_DEFECTO = 'red';

/** Qué hace falta para que los comandos de esa carpeta funcionen de verdad. */
const NOTA_BOT: Record<string, string> = {
  google: 'Necesita tu cuenta de Google conectada en el bot: Calendar, Sheets, Docs, Drive y Gmail.',
  github: 'Por ahora solo consulta repositorios públicos; escribir en GitHub pide conectar tu cuenta.',
  red: 'Funciona dentro de NFSocial: equipos, grupos y roles de la red.',
  youtube: 'Usa el reproductor compartido del chat.',
  negocios: 'Tarjetas, búsquedas, reuniones, encuestas y tickets de la red.'
};

const PARA_QUE: Record<string, string> = {
  'google-calendar': 'Mueve tu Google Calendar: crea, cancela y comparte eventos con quien le digas.',
  'google-sheets': 'Trabaja tus hojas de Google: las crea, escribe filas y reparte permisos.',
  'google-docs': 'Crea y edita documentos de Google Docs, y los comparte con tu equipo.',
  'google-drive': 'Ordena tu Drive: busca archivos, los mueve de carpeta y los comparte.',
  gmail: 'Escribe y envía correos desde tu Gmail.',
  github: 'Consulta y toca tus repositorios: issues, ramas, commits y pull requests.',
  youtube: 'Revisa tus videos y tu canal de YouTube.',
  red: 'Todo lo de la propia red social: publicar, comentar, seguir y ver tu perfil.'
};

const PARA_QUE_CATEGORIA: Record<string, string> = {
  calendar: 'Agenda y consulta tu tiempo.',
  sheets: 'Hojas de cálculo con datos de la red o de tu equipo.',
  docs: 'Documentos escritos y compartidos.',
  drive: 'Archivos y carpetas.',
  gmail: 'Correo.',
  github: 'Código y repositorios.',
  youtube: 'Tus videos.',
  networking: 'Personas, contactos y tu red.',
  equipos: 'Equipos de trabajo y sus miembros.',
  grupos: 'Grupos y sus permisos.',
  nfc: 'Cosas que se tocan con el móvil.'
};

@Component({
  selector: 'app-guia-comandos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './guia-comandos.component.html',
  styleUrls: ['./guia-comandos.component.scss']
})
export class GuiaComandosComponent implements OnInit {

  private comandos = inject(ComandosService);
  private destroyRef = inject(DestroyRef);

  /** Dentro de Ajustes la guía va sin su propio marco, que ya lo pone la tarjeta. */
  readonly compacta = input(false);

  readonly busqueda = signal('');
  readonly categorias = signal<CategoriaComando[]>([]);
  readonly definiciones = signal<ComandoDefinicion[]>([]);
  readonly bots = signal<Array<{ id: string; nombre: string; descripcion: string; icono: string; categorias: string[] }>>([]);

  /** Carpeta abierta: null = vista de carpetas. */
  readonly carpetaId = signal<string | null>(null);
  /** Comando abierto dentro de una carpeta (el que muestra el detalle). */
  readonly abierto = signal<string | null>(null);
  readonly copiado = signal<string | null>(null);
  readonly cargando = signal(true);

  readonly grupos = computed<GrupoComandos[]>(() => {
    const texto = this.busqueda().trim().toLowerCase();

    return this.categorias()
      .map((categoria) => {
        const comandos = this.definiciones().filter((comando) => {
          if (comando.categoria !== categoria.id) return false;
          if (!texto) return true;

          return (
            comando.nombre.toLowerCase().includes(texto) ||
            comando.descripcion.toLowerCase().includes(texto) ||
            categoria.nombre.toLowerCase().includes(texto)
          );
        });

        return { categoria, comandos };
      })
      .filter((grupo) => grupo.comandos.length > 0);
  });

  /** Con una búsqueda activa se muestran resultados planos, sin carpetas. */
  readonly buscando = computed(() => this.busqueda().trim().length > 0);

  readonly totalComandos = computed(() => this.definiciones().length);

  readonly carpetaActual = computed<GrupoComandos | null>(() => {
    const id = this.carpetaId();
    if (!id) return null;
    return this.grupos().find((grupo) => grupo.categoria.id === id) ?? null;
  });

  readonly detalle = computed<ComandoDefinicion | null>(() => {
    const nombre = this.abierto();
    if (!nombre) return null;
    return this.definiciones().find((comando) => comando.nombre === nombre) ?? null;
  });

  ngOnInit(): void {
    this.comandos.getGuia()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (guia) => {
          this.categorias.set(guia.categorias ?? []);
          this.definiciones.set(guia.comandos ?? []);
          this.bots.set(guia.bots ?? []);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false)
      });
  }

  paraQue(api: string): string {
    return PARA_QUE[api] ?? 'Acciones sobre tus herramientas conectadas.';
  }

  paraQueCategoria(id: string): string {
    return PARA_QUE_CATEGORIA[id] ?? '';
  }

  /** Icono de la carpeta: el de su categoría o, si no, el del bot al que pertenece. */
  icono(categoria: CategoriaComando): string {
    return categoria.icono || this.botDe(categoria.id)?.icono || 'fa-solid fa-folder';
  }

  botDe(categoriaId: string) {
    const id = BOT_POR_CATEGORIA[categoriaId] ?? BOT_POR_DEFECTO;
    return this.bots().find((bot) => bot.id === id) ?? null;
  }

  nombreBot(categoriaId: string): string {
    return this.botDe(categoriaId)?.nombre ?? 'NFSocial';
  }

  notaBot(categoriaId: string): string {
    const id = BOT_POR_CATEGORIA[categoriaId] ?? BOT_POR_DEFECTO;
    return NOTA_BOT[id] ?? '';
  }

  escribir(comando: ComandoDefinicion): boolean {
    return comando.escritura;
  }

  hayParametros(comando: ComandoDefinicion): boolean {
    return comando.parametros.length > 0;
  }

  /** Cuántos comandos de la carpeta cambian algo de verdad (el resto solo consultan). */
  cuantosEscriben(grupo: GrupoComandos): number {
    return grupo.comandos.filter((comando) => comando.escritura).length;
  }

  resumen(grupo: GrupoComandos): string {
    const total = grupo.comandos.length;
    const escriben = this.cuantosEscriben(grupo);
    if (escriben === 0) return `${total} ${total === 1 ? 'comando' : 'comandos'} · solo consultan`;
    if (escriben === total) return `${total} ${total === 1 ? 'comando' : 'comandos'} · todos cambian algo`;
    return `${total} comandos · ${escriben} cambian algo`;
  }

  abrirCarpeta(id: string): void {
    this.busqueda.set('');
    this.abierto.set(null);
    this.carpetaId.set(id);
  }

  volver(): void {
    this.carpetaId.set(null);
    this.abierto.set(null);
  }

  alternar(nombre: string): void {
    this.abierto.set(this.abierto() === nombre ? null : nombre);
  }

  escribirTexto(valor: string): void {
    this.busqueda.set(valor);
    if (valor.trim()) this.carpetaId.set(null);
  }

  copiar(ejemplo: string, evento?: Event): void {
    evento?.stopPropagation();
    navigator.clipboard.writeText(ejemplo).then(() => {
      this.copiado.set(ejemplo);
      setTimeout(() => this.copiado.set(null), 1600);
    });
  }
}
