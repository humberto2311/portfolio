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
