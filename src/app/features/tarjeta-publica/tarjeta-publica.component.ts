import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { VcardService } from '../../core/services/vcard.service';
import { CampoExtraVcard, VCardPayload } from '../../core/models/vcard.model';

/**
 * Página que se abre al escanear el QR o tocar el NFC.
 * Muestra la tarjeta y permite guardar el contacto en el teléfono.
 */
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

  cargando = signal(true);
  noEncontrada = signal(false);
  tarjeta = signal<VCardPayload | null>(null);
  aviso = signal<string | null>(null);

  /** true cuando se abrió desde el QR / NFC (?auto=1): guarda el contacto solo. */
  modoNfc = signal(false);

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('userId') ?? '';
    this.modoNfc.set(this.route.snapshot.queryParamMap.get('auto') === '1');

    if (!this.userId) {
      this.noEncontrada.set(true);
      this.cargando.set(false);
      return;
    }

    this.vcardService.tarjetaDe(this.userId).subscribe({
      next: (t) => {
        if (!t) this.noEncontrada.set(true);
        this.tarjeta.set(t);
        this.cargando.set(false);

        // Llegó escaneando el QR o tocando el NFC: se intenta guardar solo.
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

  // ====== acciones ======

  guardarContacto(): void {
    if (!this.userId) return;

    this.vcardService.vcfPublico(this.userId).subscribe({
      next: async (blob) => {
        const archivo = new File([blob], this.nombreArchivo(), { type: 'text/vcard' });

        // En el móvil se abre la hoja de compartir con "Anadir a contactos".
        const nav = navigator as any;
        if (nav.canShare && nav.canShare({ files: [archivo] })) {
          try {
            await nav.share({ files: [archivo], title: this.tarjeta()?.nombre ?? 'Contacto' });
            this.aviso.set('Listo. Si tu teléfono lo pregunta, elige "Añadir a contactos".');
            return;
          } catch {
            // cancelo o fallo: se intenta la descarga normal
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
      navigator.share({ title: this.tarjeta()?.nombre ?? 'Tarjeta de contacto', url })
        .catch(() => { /* el usuario canceló */ });
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
    };

    return mapa[clave] ?? 'fa-solid fa-circle-dot';
  }

  private nombreArchivo(): string {
    const base = (this.tarjeta()?.nombre ?? 'contacto').replace(/\s+/g, '-').toLowerCase();
    return `${base}.vcf`;
  }
}
