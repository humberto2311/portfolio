import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { VcardService } from '../../core/services/vcard.service';
import { CampoExtraVcard, VCardPayload } from '../../core/models/vcard.model';

@Component({
  selector: 'app-tarjeta-publica',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tarjeta-publica.component.html',
  styleUrls: ['./tarjeta-publica.component.scss'],
})
export class TarjetaPublicaComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private vcardService = inject(VcardService);

  private userId = '';
  private slug = '';

  cargando = signal(true);
  noEncontrada = signal(false);
  tarjeta = signal<VCardPayload | null>(null);
  aviso = signal<string | null>(null);

  /** true cuando se abrió desde el QR / NFC (?auto=1): guarda el contacto solo. */
  modoNfc = signal(false);

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('userId') ?? '';
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.modoNfc.set(this.route.snapshot.queryParamMap.get('auto') === '1');

    if (!this.userId) {
      this.noEncontrada.set(true);
      this.cargando.set(false);
      return;
    }

    const peticion$ = this.slug
      ? this.vcardService.tarjetaPorSlug(this.userId, this.slug)
      : this.vcardService.tarjetaPorDefecto(this.userId);

    peticion$.subscribe({
      next: (t) => {
        if (!t) this.noEncontrada.set(true);
        this.tarjeta.set(t);
        this.cargando.set(false);

        if (t && this.modoNfc()) {
          setTimeout(() => this.guardarContacto(), 700);
        }
      },
      error: () => {
        this.noEncontrada.set(true);
        this.cargando.set(false);
      },
    });
  }

  readonly iniciales = computed(() => {
    const nombre = this.tarjeta()?.nombre?.trim() ?? '';
    if (!nombre) return '??';

    const partes = nombre.split(/\s+/).filter(Boolean);
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
  });

  readonly campos = computed<CampoExtraVcard[]>(() =>
    (this.tarjeta()?.campos ?? []).filter((c) => c.valor?.trim())
  );

  // ====== ACCIONES ======

  guardarContacto(): void {
    const t = this.tarjeta();
    if (!this.userId || !t?.slug) return;

    this.vcardService.vcfPublico(this.userId, t.slug).subscribe({
      next: async (blob) => {
        const archivo = new File([blob], this.nombreArchivo(), { type: 'text/vcard' });

        const nav = navigator as any;
        if (nav.canShare && nav.canShare({ files: [archivo] })) {
          try {
            await nav.share({
              files: [archivo],
              title: this.tarjeta()?.nombre ?? 'Contacto',
            });
            this.aviso.set('Listo. Si tu teléfono lo pregunta, elige "Añadir a contactos".');
            return;
          } catch {
            /* canceló o falló: se intenta la descarga normal */
          }
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = archivo.name;
        a.click();
        URL.revokeObjectURL(url);

        this.aviso.set('Contacto descargado. Ábrelo para guardarlo en tu agenda.');
      },
      error: () => this.aviso.set('No se pudo descargar el contacto. Intenta de nuevo.'),
    });
  }

  compartir(): void {
    const url = window.location.href;

    if (navigator.share) {
      navigator.share({
        title: this.tarjeta()?.nombre ?? 'Tarjeta de contacto',
        url,
      }).catch(() => { /* el usuario canceló */ });
      return;
    }

    this.copiar(url, 'Enlace copiado');
  }

  copiar(valor: string, mensaje: string): void {
    navigator.clipboard?.writeText(valor).then(
      () => this.aviso.set(mensaje),
      () => this.aviso.set(valor)
    );
  }

  enlaceTel(valor: string): string {
    return `tel:${(valor ?? '').replace(/[^\d+]/g, '')}`;
  }

  enlaceCorreo(valor: string): string {
    return `mailto:${valor}`;
  }

  enlaceWeb(valor: string): string {
    const v = (valor ?? '').trim();
    if (v.startsWith('http://') || v.startsWith('https://')) return v;
    return `https://${v}`;
  }

  icono(clave: string): string {
    const mapa: Record<string, string> = {
      telefono2: 'fa-solid fa-phone',
      telefonoFijo: 'fa-solid fa-phone-office',
      email2: 'fa-solid fa-envelope',
      whatsapp: 'fa-brands fa-whatsapp',
      instagram: 'fa-brands fa-instagram',
      twitter: 'fa-brands fa-x-twitter',
      facebook: 'fa-brands fa-facebook',
      youtube: 'fa-brands fa-youtube',
      tiktok: 'fa-brands fa-tiktok',
      behance: 'fa-brands fa-behance',
      telegram: 'fa-brands fa-telegram',
      twitch: 'fa-brands fa-twitch',
      portafolio: 'fa-solid fa-link',
      calendly: 'fa-solid fa-calendar-days',
      catalogo: 'fa-solid fa-store',
      blog: 'fa-solid fa-pen-nib',
      direccion: 'fa-solid fa-location-dot',
      horario: 'fa-solid fa-clock',
      logoUrl: 'fa-solid fa-image',
      sitioEmpresa: 'fa-solid fa-building',
      // emergencia
      contactoEmergencia1: 'fa-solid fa-phone-volume',
      contactoEmergencia2: 'fa-solid fa-phone-volume',
      tipoSangre: 'fa-solid fa-droplet',
      alergias: 'fa-solid fa-triangle-exclamation',
      condiciones: 'fa-solid fa-notes-medical',
      medicamentos: 'fa-solid fa-pills',
      seguroMedico: 'fa-solid fa-shield-heart',
      donanteOrganos: 'fa-solid fa-heart',
      indicaciones: 'fa-solid fa-circle-info',
    };

    return mapa[clave] ?? 'fa-solid fa-circle-dot';
  }

  private nombreArchivo(): string {
    const base = (this.tarjeta()?.nombre ?? 'contacto')
      .replace(/\s+/g, '-')
      .toLowerCase();
    return `${base}.vcf`;
  }
}