import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Empresa, EmpresaForm, TipoEmpresa } from '../../../core/models/empresa.model';
import { EmpresaService, mensajeDeError } from '../../../core/services/empresa.service';
import { ToastService } from '../../../core/services/toast.service';
import { documentosExigidos, etiquetaOpcion, leerImagen, slugificar } from '../empresa-ui';

@Component({
  selector: 'app-empresa-crear',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './empresa-crear.component.html',
  styleUrls: ['./empresa-crear.component.scss'],
})
export class EmpresaCrearComponent implements OnInit {
  private empresa = inject(EmpresaService);
  private toast = inject(ToastService);

  @Output() creada = new EventEmitter<Empresa>();
  @Output() cancelar = new EventEmitter<void>();

  readonly catalogo = this.empresa.catalogo;

  nombre = '';
  razonSocial = '';
  tipo: TipoEmpresa | null = null;
  sector = '';
  nit = '';
  slug = '';
  eslogan = '';
  descripcion = '';
  direccion = '';
  ciudad = '';
  departamento = '';
  telefono = '';
  whatsapp = '';
  correo = '';
  sitioWeb = '';
  instagramUrl = '';
  facebookUrl = '';
  tiktokUrl = '';
  horario = '';
  logoUrl = '';
  portadaUrl = '';

  slugEditado = false;
  slugEstado: 'inactivo' | 'revisando' | 'libre' | 'ocupado' = 'inactivo';
  guardando = false;
  errores: string[] = [];

  private temporizador: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.empresa.cargarCatalogo().subscribe();
  }

  readonly tipos: { valor: TipoEmpresa; titulo: string; descripcion: string; icono: string }[] = [
    {
      valor: 'LEGALMENTE_CONSTITUIDA',
      titulo: 'Legalmente constituida',
      descripcion: 'Tiene NIT, cámara de comercio y representante legal. Se certifica con documentos del Estado.',
      icono: 'fa-solid fa-building-columns',
    },
    {
      valor: 'MIPYME',
      titulo: 'Mipyme',
      descripcion: 'Pequeña o mediana empresa formal. También puede certificarse con sus documentos.',
      icono: 'fa-solid fa-store',
    },
    {
      valor: 'PERSONAL',
      titulo: 'Personal',
      descripcion: 'Marca personal o emprendimiento sin constituir. No pide documentos ni se certifica.',
      icono: 'fa-solid fa-user-tie',
    },
  ];

  get nombreValido(): boolean {
    return this.nombre.trim().length >= 2;
  }

  get puedeCrear(): boolean {
    return this.nombreValido && this.tipo !== null && !this.guardando;
  }

  get documentos(): string[] {
    const catalogo = this.catalogo();
    return documentosExigidos(this.tipo, this.sector || null).map((tipo) =>
      etiquetaOpcion(catalogo, 'documentos', tipo),
    );
  }

  cambiarNombre(valor: string): void {
    this.nombre = valor;

    if (!this.slugEditado) {
      this.slug = slugificar(valor);
      this.slugEstado = 'inactivo';
    }
  }

  cambiarSlug(valor: string): void {
    this.slugEditado = true;
    this.slug = slugificar(valor);
    this.slugEstado = 'inactivo';
    this.programarRevision();
  }

  revisarSlug(): void {
    const slug = this.slug.trim();

    if (!slug) {
      this.slugEstado = 'inactivo';
      return;
    }

    this.slugEstado = 'revisando';
    this.empresa.slugLibre(slug).subscribe((libre) => {
      this.slugEstado = libre ? 'libre' : 'ocupado';
    });
  }

  elegirTipo(tipo: TipoEmpresa): void {
    this.tipo = tipo;
  }

  logoDesdeArchivo(input: HTMLInputElement): void {
    this.cargarImagen(input, (url) => (this.logoUrl = url));
  }

  portadaDesdeArchivo(input: HTMLInputElement): void {
    this.cargarImagen(input, (url) => (this.portadaUrl = url));
  }

  quitarLogo(): void {
    this.logoUrl = '';
  }

  quitarPortada(): void {
    this.portadaUrl = '';
  }

  iniciales(): string {
    const partes = this.nombre.trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return 'EM';
    return partes.length === 1
      ? partes[0].slice(0, 2).toUpperCase()
      : (partes[0][0] + partes[1][0]).toUpperCase();
  }

  crear(): void {
    this.errores = [];

    if (!this.nombreValido) {
      this.errores.push('Escribe el nombre de la empresa.');
      return;
    }
    if (!this.tipo) {
      this.errores.push('Elige el tipo de empresa.');
      return;
    }
    if (this.nit.trim() && !/^\d{8,10}-\d$/.test(this.nit.trim())) {
      this.errores.push('El NIT debe verse así: 811000000-1.');
      return;
    }

    const form: EmpresaForm = {
      nombre: this.nombre.trim(),
      razonSocial: this.limpiar(this.razonSocial),
      tipo: this.tipo,
      sector: this.sector || null,
      nit: this.limpiar(this.nit),
      slug: this.limpiar(this.slug),
      eslogan: this.limpiar(this.eslogan),
      descripcion: this.limpiar(this.descripcion),
      direccion: this.limpiar(this.direccion),
      ciudad: this.limpiar(this.ciudad),
      departamento: this.limpiar(this.departamento),
      telefono: this.limpiar(this.telefono),
      whatsapp: this.limpiar(this.whatsapp),
      correo: this.limpiar(this.correo),
      sitioWeb: this.limpiar(this.sitioWeb),
      instagramUrl: this.limpiar(this.instagramUrl),
      facebookUrl: this.limpiar(this.facebookUrl),
      tiktokUrl: this.limpiar(this.tiktokUrl),
      horario: this.limpiar(this.horario),
      logoUrl: this.logoUrl || null,
      portadaUrl: this.portadaUrl || null,
    };

    this.guardando = true;

    this.empresa
      .crear(form)
      .pipe(finalize(() => (this.guardando = false)))
      .subscribe({
        next: (empresa) => {
          this.toast.show('Empresa creada. Ya eres su administrador.');
          this.creada.emit(empresa);
        },
        error: (err) => {
          const mensaje = mensajeDeError(err, 'No se pudo crear la empresa.');
          this.errores = [mensaje];
        },
      });
  }

  cerrar(): void {
    this.cancelar.emit();
  }

  private cargarImagen(input: HTMLInputElement, asignar: (url: string) => void): void {
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;

    leerImagen(archivo).then(
      (url) => {
        this.errores = [];
        asignar(url);
      },
      (error: Error) => {
        this.errores = [error.message];
      },
    );
  }

  private programarRevision(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.revisarSlug(), 500);
  }

  private limpiar(valor: string): string | null {
    const limpio = valor.trim();
    return limpio ? limpio : null;
  }
}
