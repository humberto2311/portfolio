import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CategoriaComando, ComandoDefinicion } from '../../../core/models/comando.model';
import { ComandosService } from '../../../core/services/comandos.service';

interface GrupoComandos {
  categoria: CategoriaComando;
  comandos: ComandoDefinicion[];
}

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

  readonly busqueda = signal('');
  readonly categorias = signal<CategoriaComando[]>([]);
  readonly definiciones = signal<ComandoDefinicion[]>([]);
  readonly categoriaActiva = signal<string | null>(null);
  readonly cargando = signal(true);
  readonly abierto = signal<string | null>(null);
  readonly copiado = signal<string | null>(null);

  readonly grupos = computed<GrupoComandos[]>(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const activa = this.categoriaActiva();

    return this.categorias()
      .filter((categoria) => !activa || categoria.id === activa)
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

  readonly totalVisibles = computed(() =>
    this.grupos().reduce((total, grupo) => total + grupo.comandos.length, 0)
  );

  ngOnInit(): void {
    this.comandos.getGuia()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (guia) => {
          this.categorias.set(guia.categorias ?? []);
          this.definiciones.set(guia.comandos ?? []);
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

  escribir(comando: ComandoDefinicion): boolean {
    return comando.escritura;
  }

  hayParametros(comando: ComandoDefinicion): boolean {
    return comando.parametros.length > 0;
  }

  alternar(nombre: string): void {
    this.abierto.set(this.abierto() === nombre ? null : nombre);
  }

  filtrarCategoria(id: string | null): void {
    this.categoriaActiva.set(id);
  }

  copiar(ejemplo: string): void {
    navigator.clipboard.writeText(ejemplo).then(() => {
      this.copiado.set(ejemplo);
      setTimeout(() => this.copiado.set(null), 1600);
    });
  }
}
