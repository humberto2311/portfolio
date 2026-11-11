import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { VcardService } from '../../core/services/vcard.service';
import { ArchivoService } from '../../core/services/archivo.service';
import { ToqueNfcService } from '../../core/services/toque-nfc.service';
import { DisenoService } from '../../core/services/diseno.service';
import { TemaService } from '../../core/services/tema.service';
import { AuthService } from '../../core/services/auth.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { PrivateNavbarComponent } from '../../layout/private-layout/navbar/navbar.component';
import { LoginModalComponent } from '../../shared/components/login-modal/login-modal.component';
import { CampoExtraVcard, VCardPayload } from '../../core/models/vcard.model';

@Component({
  selector: 'app-tarjeta-publica',
  standalone: true,
  imports: [CommonModule, NavbarComponent, PrivateNavbarComponent, LoginModalComponent],
  templateUrl: './tarjeta-publica.component.html',
  styleUrls: ['./tarjeta-publica.component.scss'],
})
export class TarjetaPublicaComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private vcardService = inject(VcardService);
  private archivos = inject(ArchivoService);
  private diseno = inject(DisenoService);
  private toques = inject(ToqueNfcService);
  readonly tema = inject(TemaService);
  readonly auth = inject(AuthService);

  private userId = '';
  private slug = '';
  private registroHecho = false;

  cargando = signal(true);
  noEncontrada = signal(false);
  tarjeta = signal<VCardPayload | null>(null);
  aviso = signal<string | null>(null);
  disenoAjeno = signal(false);

  private readonly destroyRef = inject(DestroyRef);

  /** true cuando se abrió desde el QR / NFC (?auto=1): guarda el contacto solo. */
  modoNfc = signal(false);

  ngOnInit(): void {
    this.tema.pintar(this.tema.claro());

    this.userId = this.route.snapshot.paramMap.get('userId') ?? '';
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.modoNfc.set(this.route.snapshot.queryParamMap.get('auto') === '1');

    if (!this.userId) {
      this.noEncontrada.set(true);
      this.cargando.set(false);
      return;
    }

    this.diseno.cargarDeUsuario(this.userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((d) => {
        const tarjeta = this.diseno.estaTarjeta(d);
        this.disenoAjeno.set(tarjeta.activo);
        this.diseno.aplicarAjeno(tarjeta);
      });

    const peticion$ = this.slug
      ? this.vcardService.tarjetaPorSlug(this.userId, this.slug)
      : this.vcardService.tarjetaPorDefecto(this.userId);

    peticion$.subscribe({
      next: (t) => {
        if (!t) this.noEncontrada.set(true);
        this.tarjeta.set(t);
        this.cargando.set(false);

        if (t && this.modoNfc()) {
          this.registrarToque();
          if (this.archivos.esNativa) setTimeout(() => this.guardarContacto(true), 700);
        }
      },
      error: () => {
        this.noEncontrada.set(true);
        this.cargando.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.disenoAjeno.set(false);
    this.diseno.limpiarAjeno();
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

  alternarTema(): void {
    this.tema.guardar(!this.tema.claro());
  }

  private async registrarToque(): Promise<void> {
    if (this.registroHecho || !this.userId) return;
    this.registroHecho = true;

    await this.toques.registrar({
      usuarioId: this.userId,
      tarjeta: this.tarjeta()?.slug ?? this.slug,
      enlace: typeof window === 'undefined' ? undefined : window.location.href,
      origen: this.archivos.esNativa ? 'ETIQUETA' : 'NAVEGADOR',
      tieneApp: this.archivos.esNativa,
    });
  }

  guardarContacto(silencioso = false): void {
    const t = this.tarjeta();
    if (!this.userId || !t?.slug) return;

    const nombre = this.tarjeta()?.nombre ?? 'Contacto';

    this.vcardService.vcfPublico(this.userId, t.slug).subscribe({
      next: async (blob) => {
        if (this.archivos.esNativa) {
          try {
            await this.archivos.guardar(blob, this.nombreArchivo(), nombre);
            if (!silencioso) this.aviso.set('Listo. Elige "Añadir a contactos" y quedará en tu agenda.');
          } catch {
            if (!silencioso) this.aviso.set('No se pudo guardar el contacto. Intenta de nuevo.');
          }
          return;
        }

        const compartido = await this.archivos.compartirArchivo(blob, this.nombreArchivo(), nombre);

        if (compartido === 'compartido') {
          if (!silencioso) this.aviso.set('Contacto compartido.');
          return;
        }
        if (compartido === 'cancelado') {
          if (!silencioso) this.aviso.set('Se cerró sin compartir el contacto.');
          return;
        }

        if (silencioso) {
          this.aviso.set('Tu navegador no puede compartir el contacto solo. Toca "Compartir contacto" abajo.');
          return;
        }

        try {
          await this.archivos.guardar(blob, this.nombreArchivo(), nombre);
          this.aviso.set('Contacto descargado. Ábrelo para añadirlo a tu agenda.');
        } catch {
          this.aviso.set('No se pudo guardar el contacto. Intenta de nuevo.');
        }
      },
      error: () => this.aviso.set('No se pudo descargar el contacto. Intenta de nuevo.'),
    });
  }

  get esNativa(): boolean {
    return this.archivos.esNativa;
  }

  async compartir(): Promise<void> {
    const url = window.location.href;
    const resultado = await this.archivos.compartirEnlace(
      url,
      this.tarjeta()?.nombre ?? 'Tarjeta de contacto'
    );

    if (resultado === 'compartido') return;
    if (resultado === 'cancelado') {
      this.aviso.set('Se cerró sin compartir el enlace.');
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