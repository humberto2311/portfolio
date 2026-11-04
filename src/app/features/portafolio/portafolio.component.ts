import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { VcardService } from '../../core/services/vcard.service';
import {
  CampoExtraVcard,
  CategoriaCampo,
  PlantillaVcard,
  VCardPayload,
} from '../../core/models/vcard.model';

interface Plantilla {
  id: PlantillaVcard;
  nombre: string;
  descripcion: string;
  icono: string;
}

interface DefinicionCampo {
  clave: string;
  etiqueta: string;
  placeholder: string;
  categoria: CategoriaCampo;
}

interface GrupoCampos {
  id: CategoriaCampo;
  nombre: string;
  icono: string;
  campos: DefinicionCampo[];
}

@Component({
  selector: 'app-portafolio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './portafolio.component.html',
  styleUrls: ['./portafolio.component.scss'],
})
export class PortafolioComponent implements OnInit {
  private vcardService = inject(VcardService);

  cargando = signal(true);
  guardando = signal(false);
  menuCampos = signal(false);
  mensaje = signal<string | null>(null);

  tarjeta = signal<VCardPayload>(this.vcardService.vacia());

  plantillas: Plantilla[] = [
    {
      id: 'PERSONAL',
      nombre: 'Básica',
      descripcion: 'Lo esencial: nombre, teléfono y correo. Para amigos y familia.',
      icono: 'fa-solid fa-user',
    },
    {
      id: 'PROFESIONAL',
      nombre: 'Profesional',
      descripcion: 'Empresa, puesto, varios teléfonos y LinkedIn.',
      icono: 'fa-solid fa-briefcase',
    },
    {
      id: 'DIGITAL',
      nombre: 'Digital',
      descripcion: 'Tu web, portafolio, redes y mensajería directa.',
      icono: 'fa-solid fa-globe',
    },
    {
      id: 'TOTAL',
      nombre: 'Total',
      descripcion: 'Todos los campos disponibles, sin límites.',
      icono: 'fa-solid fa-layer-group',
    },
  ];

  grupos: GrupoCampos[] = [
    {
      id: 'contacto',
      nombre: 'Contacto',
      icono: 'fa-solid fa-phone',
      campos: [
        { clave: 'telefono2', etiqueta: 'Segundo teléfono', placeholder: '+57 300 000 0000', categoria: 'contacto' },
        { clave: 'telefonoFijo', etiqueta: 'Teléfono fijo', placeholder: '(605) 000 0000', categoria: 'contacto' },
        { clave: 'email2', etiqueta: 'Correo secundario', placeholder: 'otro@correo.com', categoria: 'contacto' },
        { clave: 'whatsapp', etiqueta: 'WhatsApp', placeholder: '+57 300 000 0000', categoria: 'contacto' },
      ],
    },
    {
      id: 'redes',
      nombre: 'Redes sociales',
      icono: 'fa-solid fa-share-nodes',
      campos: [
        { clave: 'instagram', etiqueta: 'Instagram', placeholder: '@tuusuario', categoria: 'redes' },
        { clave: 'twitter', etiqueta: 'X / Twitter', placeholder: '@tuusuario', categoria: 'redes' },
        { clave: 'facebook', etiqueta: 'Facebook', placeholder: 'facebook.com/tuperfil', categoria: 'redes' },
        { clave: 'youtube', etiqueta: 'YouTube', placeholder: 'youtube.com/@tucanal', categoria: 'redes' },
        { clave: 'tiktok', etiqueta: 'TikTok', placeholder: '@tuusuario', categoria: 'redes' },
        { clave: 'behance', etiqueta: 'Behance', placeholder: 'behance.net/tuperfil', categoria: 'redes' },
        { clave: 'telegram', etiqueta: 'Telegram', placeholder: '@tuusuario', categoria: 'redes' },
        { clave: 'twitch', etiqueta: 'Twitch', placeholder: 'twitch.tv/tucanal', categoria: 'redes' },
      ],
    },
    {
      id: 'enlaces',
      nombre: 'Enlaces web',
      icono: 'fa-solid fa-link',
      campos: [
        { clave: 'portafolio', etiqueta: 'Portafolio', placeholder: 'tupagina.com', categoria: 'enlaces' },
        { clave: 'calendly', etiqueta: 'Agenda de citas', placeholder: 'calendly.com/tuusuario', categoria: 'enlaces' },
        { clave: 'catalogo', etiqueta: 'Catálogo de productos', placeholder: 'tutienda.com', categoria: 'enlaces' },
        { clave: 'blog', etiqueta: 'Blog o artículos', placeholder: 'tublog.com', categoria: 'enlaces' },
      ],
    },
    {
      id: 'empresa',
      nombre: 'Datos de empresa',
      icono: 'fa-solid fa-building',
      campos: [
        { clave: 'direccion', etiqueta: 'Dirección', placeholder: 'Calle 00 #00-00, Ciudad', categoria: 'empresa' },
        { clave: 'horario', etiqueta: 'Horario de atención', placeholder: 'Lun a vie, 8:00 a 18:00', categoria: 'empresa' },
        { clave: 'logoUrl', etiqueta: 'Logotipo (enlace)', placeholder: 'https://.../logo.png', categoria: 'empresa' },
        { clave: 'sitioEmpresa', etiqueta: 'Sitio de la empresa', placeholder: 'miempresa.com', categoria: 'empresa' },
      ],
    },
  ];

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);

    this.vcardService.miTarjeta().subscribe({
      next: (t) => {
        if (t) {
          this.tarjeta.set({
            ...this.vcardService.vacia(),
            ...t,
            campos: t.campos ?? [],
          });
        }
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.mensaje.set('No se pudo cargar tu tarjeta. Revisa tu sesión.');
      },
    });
  }

  // ====== plantillas ======

  elegirPlantilla(id: PlantillaVcard): void {
    this.tarjeta.update((t) => ({ ...t, plantilla: id }));
  }

  /** Cambia un campo base (nombre, email, notas...). */
  set<K extends keyof VCardPayload>(campo: K, valor: VCardPayload[K]): void {
    this.tarjeta.update((t) => ({ ...t, [campo]: valor }));
  }

  /** Cambia el valor de un campo modular. */
  setCampo(clave: string, valor: string): void {
    this.tarjeta.update((t) => ({
      ...t,
      campos: t.campos.map((c) => (c.clave === clave ? { ...c, valor } : c)),
    }));
  }

  plantillaActual(): Plantilla {
    return this.plantillas.find((p) => p.id === this.tarjeta().plantilla) ?? this.plantillas[0];
  }

  // ====== campos modulares ======

  toggleMenu(): void {
    this.menuCampos.update((v) => !v);
  }

  tieneCampo(clave: string): boolean {
    return this.tarjeta().campos.some((c) => c.clave === clave);
  }

  agregarCampo(def: DefinicionCampo): void {
    if (this.tieneCampo(def.clave)) return;

    const nuevo: CampoExtraVcard = {
      clave: def.clave,
      etiqueta: def.etiqueta,
      valor: '',
      categoria: def.categoria,
    };

    this.tarjeta.update((t) => ({ ...t, campos: [...t.campos, nuevo] }));
  }

  quitarCampo(clave: string): void {
    this.tarjeta.update((t) => ({
      ...t,
      campos: t.campos.filter((c) => c.clave !== clave),
    }));
  }

  /** Campos agregados agrupados por categoría (para el formulario). */
  camposAgregados(categoria: CategoriaCampo): CampoExtraVcard[] {
    return this.tarjeta().campos.filter((c) => c.categoria === categoria);
  }

  // ====== vista previa ======

  readonly categoriasPreview = computed<CategoriaCampo[]>(() => {
    switch (this.tarjeta().plantilla) {
      case 'PERSONAL':
        return ['contacto'];
      case 'PROFESIONAL':
        return ['contacto', 'empresa'];
      case 'DIGITAL':
        return ['contacto', 'redes', 'enlaces'];
      default:
        return ['contacto', 'redes', 'enlaces', 'empresa'];
    }
  });

  readonly camposPreview = computed<CampoExtraVcard[]>(() => {
    const visibles = this.categoriasPreview();
    return this.tarjeta()
      .campos.filter((c) => visibles.includes(c.categoria) && c.valor.trim() !== '');
  });

  readonly iniciales = computed(() => {
    const nombre = this.tarjeta().nombre?.trim() ?? '';
    if (!nombre) return 'TÚ';

    const partes = nombre.split(/\s+/).filter(Boolean);
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
  });

  readonly mostrarEmpresa = computed(
    () => this.tarjeta().plantilla !== 'PERSONAL'
  );

  readonly mostrarNotas = computed(() => this.tarjeta().plantilla !== 'PERSONAL');

  // ====== acciones ======

  guardar(): void {
    if (this.guardando()) return;

    this.guardando.set(true);
    this.mensaje.set(null);

    this.vcardService.guardar(this.tarjeta()).subscribe({
      next: (t) => {
        this.tarjeta.set({ ...t, campos: t.campos ?? [] });
        this.guardando.set(false);
        this.mensaje.set('Tarjeta guardada. Ya puedes descargarla o compartirla.');
      },
      error: () => {
        this.guardando.set(false);
        this.mensaje.set('No se pudo guardar. Intenta de nuevo.');
      },
    });
  }

  descargarVcf(): void {
    this.vcardService.descargarVcf().subscribe({
      next: (blob) => this.guardarBlob(blob),
      error: () => this.mensaje.set('Primero guarda tu tarjeta para poder descargarla.'),
    });
  }

  // ====== compartir (QR + enlace) ======

  compartirAbierto = signal(false);

  /** URL pública de la tarjeta (destino del QR y del NFC). */
  readonly enlacePublico = computed(() => {
    const id = this.tarjeta().userProfileId;
    if (!id || typeof window === 'undefined') return '';
    // auto=1: al abrirla desde el QR/NFC se intenta guardar el contacto solo
    return `${window.location.origin}/tarjeta/${id}?auto=1`;
  });

  /** Imagen del QR a partir del enlace público. */
  readonly qrUrl = computed(() => {
    const enlace = this.enlacePublico();
    return enlace
      ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(enlace)}`
      : '';
  });

  abrirCompartir(): void {
    this.compartirAbierto.set(true);
  }

  cerrarCompartir(): void {
    this.compartirAbierto.set(false);
  }

  copiarEnlace(): void {
    const enlace = this.enlacePublico();
    if (!enlace) return;

    navigator.clipboard?.writeText(enlace).then(
      () => this.mensaje.set('Enlace copiado. Pégalo donde quieras compartirlo.'),
      () => this.mensaje.set(enlace)
    );
  }

  private guardarBlob(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(this.tarjeta().nombre || 'mi-tarjeta').replace(/\s+/g, '-').toLowerCase()}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
