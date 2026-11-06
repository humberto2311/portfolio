import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { VcardService } from '../../core/services/vcard.service';
import { ArchivoService } from '../../core/services/archivo.service';
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
  private archivos = inject(ArchivoService);

  cargando = signal(true);
  guardando = signal(false);
  menuCampos = signal(false);
  mensaje = signal<string | null>(null);

  /** Todas las tarjetas del usuario. */
  tarjetas = signal<VCardPayload[]>([]);
  /** Tarjeta que se está editando. */
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
      id: 'EMERGENCIA',
      nombre: 'Emergencias',
      descripcion: 'Contactos de emergencia, tipo de sangre, alergias y seguro.',
      icono: 'fa-solid fa-heart-pulse',
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
    {
      id: 'emergencia',
      nombre: 'Emergencias',
      icono: 'fa-solid fa-heart-pulse',
      campos: [
        { clave: 'contactoEmergencia1', etiqueta: 'Contacto de emergencia 1', placeholder: 'Nombre · +57 300 000 0000', categoria: 'emergencia' },
        { clave: 'contactoEmergencia2', etiqueta: 'Contacto de emergencia 2', placeholder: 'Nombre · +57 300 000 0000', categoria: 'emergencia' },
        { clave: 'tipoSangre', etiqueta: 'Tipo de sangre', placeholder: 'O+', categoria: 'emergencia' },
        { clave: 'alergias', etiqueta: 'Alergias', placeholder: 'Penicilina, mariscos…', categoria: 'emergencia' },
        { clave: 'condiciones', etiqueta: 'Condiciones médicas', placeholder: 'Diabetes, asma…', categoria: 'emergencia' },
        { clave: 'medicamentos', etiqueta: 'Medicamentos actuales', placeholder: 'Losartán 50 mg', categoria: 'emergencia' },
        { clave: 'seguroMedico', etiqueta: 'Seguro médico / EPS', placeholder: 'Nombre y número de póliza', categoria: 'emergencia' },
        { clave: 'donanteOrganos', etiqueta: 'Donante de órganos', placeholder: 'Sí / No', categoria: 'emergencia' },
        { clave: 'indicaciones', etiqueta: 'Indicaciones especiales', placeholder: 'Llamar a… en caso de…', categoria: 'emergencia' },
      ],
    },
  ];

  ngOnInit(): void {
    this.cargar();
  }

  // ====== CARGA ======

  cargar(): void {
    this.cargando.set(true);

    this.vcardService.listar().subscribe({
      next: (lista) => {
        this.tarjetas.set(lista ?? []);

        const def =
          lista?.find((t) => t.porDefecto) ??
          lista?.[0] ??
          this.vcardService.vacia();

        this.seleccionar(def);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.mensaje.set('No se pudieron cargar tus tarjetas. Revisa tu sesión.');
      },
    });
  }

  // ====== SELECTOR DE TARJETA ======

  seleccionar(t: VCardPayload): void {
    this.tarjeta.set({
      ...this.vcardService.vacia(),
      ...t,
      campos: t.campos ?? [],
    });
  }

  crearNueva(plantilla: PlantillaVcard = 'PERSONAL'): void {
    this.tarjeta.set(this.vcardService.vacia(plantilla, plantilla.toLowerCase()));
  }

  // ====== PLANTILLAS ======

  elegirPlantilla(id: PlantillaVcard): void {
    this.tarjeta.update((t) => ({
      ...t,
      plantilla: id,
      // Si aún no tiene id, sugiere slug automático
      slug: t.id ? t.slug : id.toLowerCase(),
    }));
  }

  set<K extends keyof VCardPayload>(campo: K, valor: VCardPayload[K]): void {
    this.tarjeta.update((t) => ({ ...t, [campo]: valor }));
  }

  setCampo(clave: string, valor: string): void {
    this.tarjeta.update((t) => ({
      ...t,
      campos: t.campos.map((c) => (c.clave === clave ? { ...c, valor } : c)),
    }));
  }

  plantillaActual(): Plantilla {
    return this.plantillas.find((p) => p.id === this.tarjeta().plantilla) ?? this.plantillas[0];
  }

  // ====== CAMPOS MODULARES ======

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

  camposAgregados(categoria: CategoriaCampo): CampoExtraVcard[] {
    return this.tarjeta().campos.filter((c) => c.categoria === categoria);
  }

  // ====== PREVIEW ======

  readonly categoriasPreview = computed<CategoriaCampo[]>(() => {
    switch (this.tarjeta().plantilla) {
      case 'PERSONAL':
        return ['contacto'];
      case 'PROFESIONAL':
        return ['contacto', 'empresa'];
      case 'DIGITAL':
        return ['contacto', 'redes', 'enlaces'];
      case 'EMERGENCIA':
        return ['emergencia'];
      default:
        return ['contacto', 'redes', 'enlaces', 'empresa', 'emergencia'];
    }
  });

  readonly camposPreview = computed<CampoExtraVcard[]>(() => {
    const visibles = this.categoriasPreview();
    return this.tarjeta().campos.filter(
      (c) => visibles.includes(c.categoria) && c.valor.trim() !== ''
    );
  });

  readonly iniciales = computed(() => {
    const nombre = this.tarjeta().nombre?.trim() ?? '';
    if (!nombre) return 'TÚ';

    const partes = nombre.split(/\s+/).filter(Boolean);
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
  });

  readonly mostrarEmpresa = computed(
    () => this.tarjeta().plantilla !== 'PERSONAL' && this.tarjeta().plantilla !== 'EMERGENCIA'
  );

  readonly mostrarNotas = computed(
    () => this.tarjeta().plantilla !== 'PERSONAL' && this.tarjeta().plantilla !== 'EMERGENCIA'
  );

  // ====== ACCIONES ======

  guardar(): void {
    if (this.guardando()) return;

    this.guardando.set(true);
    this.mensaje.set(null);

    this.vcardService.guardar(this.tarjeta()).subscribe({
      next: (t) => {
        const normalizada: VCardPayload = { ...t, campos: t.campos ?? [] };
        this.tarjeta.set(normalizada);

        // Refresca listado local
        this.tarjetas.update((lista) => {
          const i = lista.findIndex((x) => x.id === normalizada.id);
          if (i === -1) return [...lista, normalizada];
          const copia = [...lista];
          copia[i] = normalizada;
          return copia;
        });

        this.guardando.set(false);
        this.mensaje.set('Tarjeta guardada. Ya aparece en el hub y tiene su propio QR.');
      },
      error: () => {
        this.guardando.set(false);
        this.mensaje.set('No se pudo guardar. Intenta de nuevo.');
      },
    });
  }

  eliminarTarjeta(t: VCardPayload, event: Event): void {
    event.stopPropagation();

    if (!t.id) {
      this.crearNueva('PERSONAL');
      return;
    }

    const confirmar = confirm(`¿Estás seguro de que quieres eliminar la tarjeta "${t.nombre || t.slug}"?\nEsta acción no se puede deshacer y el enlace/QR dejará de funcionar.`);
    if (!confirmar) return;

    this.vcardService.eliminar(t.id).subscribe({
      next: () => {
        this.tarjetas.update((lista) => lista.filter((x) => x.id !== t.id));
        
        if (this.tarjeta().id === t.id) {
          const restantes = this.tarjetas();
          if (restantes.length > 0) {
            this.seleccionar(restantes[0]);
          } else {
            this.crearNueva('PERSONAL');
          }
        }
        
        this.mensaje.set('Tarjeta eliminada correctamente.');
      },
      error: () => {
        this.mensaje.set('No se pudo eliminar la tarjeta. Intenta de nuevo.');
      }
    });
  }
  descargarVcf(): void {
    const slug = this.tarjeta().slug;
    this.vcardService.descargarVcf(slug).subscribe({
      next: (blob) => this.guardarBlob(blob),
      error: () =>
        this.mensaje.set('Primero guarda tu tarjeta para poder descargarla.'),
    });
  }

  // ====== COMPARTIR ======

  compartirAbierto = signal(false);

  readonly enlacePublico = computed(() => {
    const id = this.tarjeta().userProfileId;
    const slug = this.tarjeta().slug;
    if (!id || !slug || typeof window === 'undefined') return '';
    return `${window.location.origin}/tarjeta/${id}/${slug}?auto=1`;
  });

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

  private async guardarBlob(blob: Blob): Promise<void> {
    const nombre = `${(this.tarjeta().nombre || 'mi-tarjeta')
      .replace(/\s+/g, '-')
      .toLowerCase()}.vcf`;

    try {
      const resultado = await this.archivos.guardar(
        blob,
        nombre,
        this.tarjeta().nombre || 'Mi tarjeta'
      );
      this.mensaje.set(
        resultado === 'cancelado'
          ? 'Se cerró el envío sin guardar. Puedes intentarlo de nuevo.'
          : 'Tarjeta lista. Elige "Añadir a contactos" para tenerla en tu agenda.'
      );
    } catch {
      this.mensaje.set('No se pudo guardar la tarjeta en este dispositivo.');
    }
  }
}