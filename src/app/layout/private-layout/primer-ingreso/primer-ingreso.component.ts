import {
  Component,
  DestroyRef,
  PLATFORM_ID,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter, fromEvent } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { TourService } from '../../../core/services/tour.service';

interface Hito {
  icono: string;
  etiqueta: string;
  detalle: string;
}

interface Paso {
  destino: string | null;
  titulo: string;
  bajada: string;
  hitos: Hito[];
}

type Posicion = 'centro' | 'derecha' | 'izquierda' | 'abajo' | 'arriba' | 'fondo';

const ESCRITORIO = 1024;

const BIENVENIDA: Paso = {
  destino: null,
  titulo: 'Un minuto y ya sabes moverte',
  bajada: 'Te muestro qué hace cada botón y dónde está cada cosa. Puedes saltarlo y volver a abrir la guía desde tu foto de perfil.',
  hitos: [
    { icono: 'fa-solid fa-layer-group', etiqueta: 'Cuatro piezas', detalle: 'tu red social, tus tarjetas NFC, tu hoja de vida y la bolsa de empleo' },
    { icono: 'fa-solid fa-compass', etiqueta: 'Primero', detalle: 'los botones que te llevan por toda la app' },
    { icono: 'fa-solid fa-briefcase', etiqueta: 'Después', detalle: 'tu panel, la bolsa de empleo y el mapa de conexiones' },
    { icono: 'fa-solid fa-map-location-dot', etiqueta: 'Al final', detalle: 'una lista con cada cosa y dónde encontrarla' },
  ],
};

const RIEL: Paso = {
  destino: '.rail__lista',
  titulo: 'El riel: tus nueve secciones',
  bajada: 'Todo lo que puedes hacer vive en esta columna.',
  hitos: [
    { icono: 'fa-solid fa-house', etiqueta: 'Inicio', detalle: 'lo que publica tu red y tu caja para publicar' },
    { icono: 'fa-solid fa-chart-pie', etiqueta: 'Mi panel', detalle: 'tus métricas, tus gráficos y el acceso a Buscar empleo' },
    { icono: 'fa-solid fa-map-location-dot', etiqueta: 'Mapa de conexiones', detalle: 'dónde tocaste cada tarjeta, tus locales y las empresas que publican vacantes' },
    { icono: 'fa-solid fa-magnifying-glass', etiqueta: 'Talento', detalle: 'buscar perfiles por skill, rol o cercanía' },
    { icono: 'fa-solid fa-comment-dots', etiqueta: 'Mensajes', detalle: 'abre el panel de contactos y chats' },
    { icono: 'fa-solid fa-briefcase', etiqueta: 'Portafolio', detalle: 'tus tarjetas de contacto NFC, cada una con su slug, su QR y su enlace' },
    { icono: 'fa-solid fa-diagram-project', etiqueta: 'Proyectos', detalle: 'tus repos de GitHub con su ficha' },
    { icono: 'fa-solid fa-link', etiqueta: 'Mis enlaces', detalle: 'el hub de enlaces: solo uno queda activo y ese es el que se abre al acercar tu tarjeta' },
    { icono: 'fa-solid fa-file-lines', etiqueta: 'Hoja de vida', detalle: 'el editor del CV y su descarga en PDF' },
  ],
};

const PANEL: Paso = {
  destino: null,
  titulo: 'Mi panel: tu centro de mando',
  bajada: 'Arriba tienes tres pestañas: Mi panel, Empresa y Mi actividad. Y a su lado, Buscar empleo.',
  hitos: [
    { icono: 'fa-solid fa-user', etiqueta: 'Mi panel', detalle: 'métricas, gráficos de visitas y tus conexiones recientes' },
    { icono: 'fa-solid fa-building', etiqueta: 'Empresa', detalle: 'el panel de las empresas a las que perteneces' },
    { icono: 'fa-solid fa-user-tie', etiqueta: 'Mi actividad', detalle: 'lo que has hecho dentro de la empresa' },
    { icono: 'fa-solid fa-briefcase', etiqueta: 'Buscar empleo', detalle: 'el acceso directo a la bolsa de trabajo' },
  ],
};

const EMPLEO: Paso = {
  destino: null,
  titulo: 'Buscar empleo: la bolsa dentro del sistema',
  bajada: 'Bajamos vacantes reales de Computrabajo y elempleo de Colombia y las comparamos con tu hoja de vida.',
  hitos: [
    { icono: 'fa-solid fa-chart-simple', etiqueta: 'Un gráfico por vacante', detalle: 'toca una convocatoria y el gráfico se abre con sus razones: qué cumples, qué te falta y tu experiencia frente a la que piden' },
    { icono: 'fa-solid fa-percent', etiqueta: 'Porcentaje de cercanía', detalle: 'nunca llega a 100: 99 es el techo, y baja a 85 si te falta una tecnología que la oferta pide' },
    { icono: 'fa-solid fa-list-check', etiqueta: 'Todas las convocatorias', detalle: 'la lista completa a la derecha del gráfico, con scroll propio' },
    { icono: 'fa-solid fa-rotate', etiqueta: 'Filtros', detalle: 'cargo, ciudad, modalidad y un interruptor de IA que refina el puntaje' },
    { icono: 'fa-solid fa-database', etiqueta: 'Caché de 24 horas', detalle: 'la misma búsqueda no vuelve a consultar los portales durante un día' },
    { icono: 'fa-solid fa-clipboard-check', etiqueta: 'Tu hoja de vida manda', detalle: 'el puntaje sale de tus habilidades, tus años de experiencia y tu formación; si el CV está vacío, el porcentaje será bajo' },
  ],
};

const MAPA_CONEXIONES: Paso = {
  destino: null,
  titulo: 'Mapa de conexiones',
  bajada: 'El mapa real de OpenStreetMap con todo lo que ha pasado alrededor de tus tarjetas.',
  hitos: [
    { icono: 'fa-solid fa-user', etiqueta: 'Pines personales y empresariales', detalle: 'cada color es un tipo de conexión; el tamaño del círculo es el número de toques' },
    { icono: 'fa-solid fa-store', etiqueta: 'Locales registrados', detalle: 'los negocios que escaneaste, con su sector y su ciudad' },
    { icono: 'fa-solid fa-clock-rotate-left', etiqueta: 'Historial de toques', detalle: 'quién, dónde y cuándo; filtra por fecha, por NFC o QR' },
    { icono: 'fa-solid fa-briefcase', etiqueta: 'Empresas que buscan talento', detalle: 'las empresas de tu última búsqueda de empleo, cada una con su botón Ubicación' },
    { icono: 'fa-solid fa-location-crosshairs', etiqueta: 'Botón Ubicación', detalle: 'ubica la empresa en el mapa y abre una ficha con dirección, porcentaje, salario y lo que te falta' },
    { icono: 'fa-solid fa-chart-simple', etiqueta: 'El porcentaje es un botón', detalle: 'tócalo y te lleva al gráfico de esa vacante' },
    { icono: 'fa-solid fa-camera-retro', etiqueta: 'Fotos del lugar', detalle: 'imágenes reales de Mapillary alrededor del punto que elijas' },
  ],
};

const RIEL_PIE: Paso = {
  destino: '.rail__lista--pie',
  titulo: 'Ajustes, al pie del riel',
  bajada: 'Cambia tus datos, define tu contraseña y decide quién ve tu hoja de vida.',
  hitos: [],
};

const YO: Paso = {
  destino: '.rail__yo',
  titulo: 'Tu ficha',
  bajada: 'Abre tu perfil con Publicaciones, Información, Fotos y Contactos. Ahí cambias tu foto y el rol que mostras.',
  hitos: [],
};

const BUSQUEDA: Paso = {
  destino: '.topbar__busqueda',
  titulo: 'Buscar personas',
  bajada: 'Escribe un nombre o un @usuario. El desplegable filtra entre tu red, tus seguidores y gente nueva; con Enter abres el perfil.',
  hitos: [],
};

const ACCIONES: Paso = {
  destino: '.topbar__acciones',
  titulo: 'Campanita y tu menú',
  bajada: 'Los dos botones de arriba a la derecha.',
  hitos: [
    { icono: 'fa-solid fa-bell', etiqueta: 'Notificaciones', detalle: 'quién te sigue y solicitudes para compartir' },
    { icono: 'fa-solid fa-circle-user', etiqueta: 'Tu foto', detalle: 'Mi perfil, Mis enlaces, la guía, Ajustes, Seguridad y Cerrar sesión' },
  ],
};

const PUBLICAR: Paso = {
  destino: 'app-crear-post',
  titulo: 'Tu caja para publicar',
  bajada: 'Escribe qué estás desarrollando, menciona con @ y adjunta una foto. Sale en tu perfil y en el feed de quien te sigue.',
  hitos: [],
};

const TABBAR: Paso = {
  destino: '.tabbar',
  titulo: 'La barra de abajo',
  bajada: 'Los cinco accesos que vas a usar todo el tiempo.',
  hitos: [
    { icono: 'fa-solid fa-house', etiqueta: 'Inicio', detalle: 'el feed y tu caja para publicar' },
    { icono: 'fa-solid fa-magnifying-glass', etiqueta: 'Talento', detalle: 'buscar gente por skill, rol o cercanía' },
    { icono: 'fa-solid fa-comment-dots', etiqueta: 'Mensajes', detalle: 'contactos y chats' },
    { icono: 'fa-solid fa-circle-user', etiqueta: 'Perfil', detalle: 'tu ficha, con tu foto de acceso' },
    { icono: 'fa-solid fa-bars', etiqueta: 'Más', detalle: 'Portafolio, Proyectos, Mis enlaces, Hoja de vida, Ajustes, Seguridad y Salir' },
  ],
};

const MAPA: Paso = {
  destino: null,
  titulo: 'Dónde encuentras cada cosa',
  bajada: 'Cuando te pierdas, busca el nombre de la sección en esta lista.',
  hitos: [
    { icono: 'fa-solid fa-feather', etiqueta: 'Publicar o subir una foto', detalle: 'Inicio, la caja de arriba' },
    { icono: 'fa-solid fa-camera', etiqueta: 'Cambiar tu foto de perfil', detalle: 'Tu perfil, sobre la foto' },
    { icono: 'fa-solid fa-id-badge', etiqueta: 'Editar el rol que mostras', detalle: 'Tu perfil, junto al rol' },
    { icono: 'fa-solid fa-user-pen', etiqueta: 'Nombre, correo y teléfono', detalle: 'Ajustes de cuenta' },
    { icono: 'fa-solid fa-key', etiqueta: 'Poner o cambiar contraseña', detalle: 'Ajustes de cuenta' },
    { icono: 'fa-solid fa-file-lines', etiqueta: 'Hoja de vida y su PDF', detalle: 'Hoja de vida' },
    { icono: 'fa-solid fa-diagram-project', etiqueta: 'Tu código de GitHub', detalle: 'Proyectos' },
    { icono: 'fa-solid fa-address-card', etiqueta: 'Crear o editar tu tarjeta NFC', detalle: 'Portafolio' },
    { icono: 'fa-solid fa-qrcode', etiqueta: 'El QR y el enlace de una tarjeta', detalle: 'Portafolio, botón Compartir' },
    { icono: 'fa-solid fa-tower-broadcast', etiqueta: 'Qué abre tu etiqueta NFC al tocarla', detalle: 'Mis enlaces: solo puede haber un Enlace Activo' },
    { icono: 'fa-solid fa-link', etiqueta: 'Agregar o borrar enlaces', detalle: 'Mis enlaces' },
    { icono: 'fa-solid fa-comments', etiqueta: 'Chats y contactos', detalle: 'Mensajes' },
    { icono: 'fa-solid fa-users', etiqueta: 'Gente por skill o rol', detalle: 'Talento' },
    { icono: 'fa-solid fa-right-from-bracket', etiqueta: 'Sesiones abiertas en otros equipos', detalle: 'Tu foto, dentro de Seguridad' },
    { icono: 'fa-solid fa-eye', etiqueta: 'Decidir si tu CV es público', detalle: 'Ajustes de cuenta' },
    { icono: 'fa-solid fa-chart-pie', etiqueta: 'Ver tus métricas y gráficos', detalle: 'Mi panel, en el riel' },
    { icono: 'fa-solid fa-briefcase', etiqueta: 'Buscar trabajo', detalle: 'Mi panel, pestaña Buscar empleo' },
    { icono: 'fa-solid fa-percent', etiqueta: 'Ver por qué una vacante te conviene', detalle: 'Buscar empleo, toca una convocatoria' },
    { icono: 'fa-solid fa-map-location-dot', etiqueta: 'Dónde queda la empresa de una vacante', detalle: 'Mapa de conexiones, botón Ubicación' },
    { icono: 'fa-solid fa-store', etiqueta: 'Los locales que registraste', detalle: 'Mapa de conexiones, panel Locales registrados' },
    { icono: 'fa-solid fa-clock-rotate-left', etiqueta: 'Cuándo y dónde te tocaron la tarjeta', detalle: 'Mapa de conexiones, panel Historial de toques' },
    { icono: 'fa-solid fa-camera-retro', etiqueta: 'Ver fotos del lugar', detalle: 'Mapa de conexiones, tira de fotos bajo el mapa' },
  ],
};

@Component({
  selector: 'app-primer-ingreso',
  standalone: true,
  templateUrl: './primer-ingreso.component.html',
  styleUrls: ['./primer-ingreso.component.scss'],
})
export class PrimerIngresoComponent {
  readonly tour = inject(TourService);

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly plataforma = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private medidaProgramada = false;

  readonly pasos = signal<Paso[]>([]);
  readonly marco = signal<{ top: number; left: number; ancho: number; alto: number } | null>(null);
  readonly posicion = signal<Posicion>('centro');

  readonly paso = computed<Paso | undefined>(() => {
    const lista = this.pasos();
    return lista[Math.min(this.tour.paso(), lista.length - 1)];
  });
  readonly hitos = computed(() => this.paso()?.hitos ?? []);
  readonly esUltimo = computed(() => this.tour.paso() >= this.pasos().length - 1);

  constructor() {
    afterNextRender(() => {
      if (this.tour.pendiente(this.cuenta())) {
        this.tour.abrir();
      }
      this.armar();

      fromEvent(window, 'resize')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.armar());
    });

    effect(() => {
      const abierto = this.tour.abierto();
      const titulo = this.paso()?.titulo;
      if (abierto && titulo) {
        this.programar();
      }
    });

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        if (this.tour.abierto()) {
          this.tour.cerrar(this.cuenta());
        }
      });
  }

  siguiente(): void {
    this.tour.avanzar(this.pasos().length, this.cuenta());
    this.enfocar();
  }

  atras(): void {
    this.tour.retroceder();
    this.enfocar();
  }

  saltar(): void {
    this.tour.cerrar(this.cuenta());
  }

  private cuenta(): string {
    const usuario = this.auth.currentUser();
    return usuario?.gitUsername ?? usuario?.email ?? '';
  }

  private programar(): void {
    if (this.medidaProgramada) {
      return;
    }
    this.medidaProgramada = true;
    setTimeout(() => {
      this.medidaProgramada = false;
      this.armar();
    });
  }

  private armar(): void {
    if (!this.hayNavegador()) {
      return;
    }

    const base =
      window.innerWidth >= ESCRITORIO
        ? [BIENVENIDA, RIEL, PANEL, EMPLEO, MAPA_CONEXIONES, BUSQUEDA, ACCIONES, RIEL_PIE, YO, PUBLICAR, MAPA]
        : [BIENVENIDA, TABBAR, PANEL, EMPLEO, MAPA_CONEXIONES, BUSQUEDA, ACCIONES, PUBLICAR, MAPA];

    const disponibles = base.filter((paso) => !paso.destino || this.visible(paso.destino));
    const actuales = this.pasos();

    if (actuales.length !== disponibles.length || actuales.some((p, i) => p.titulo !== disponibles[i].titulo)) {
      this.pasos.set(disponibles);
    }

    if (this.tour.paso() > disponibles.length - 1) {
      this.tour.paso.set(disponibles.length - 1);
    }

    this.enfocar();
  }

  private visible(destino: string): boolean {
    const el = document.querySelector(destino);
    if (!el) {
      return false;
    }
    const caja = el.getBoundingClientRect();
    return caja.width > 4 && caja.height > 4;
  }

  private enfocar(): void {
    const destino = this.paso()?.destino;
    const el = destino && this.hayNavegador() ? document.querySelector(destino) : null;

    if (!el) {
      this.marco.set(null);
      this.posicion.set('centro');
      return;
    }

    const caja = el.getBoundingClientRect();
    this.marco.set({
      top: Math.max(4, caja.top - 8),
      left: Math.max(4, caja.left - 8),
      ancho: caja.width + 16,
      alto: caja.height + 16,
    });
    this.posicion.set(this.lugar(caja));
  }

  private lugar(caja: DOMRect): Posicion {
    const ancho = window.innerWidth;
    const alto = window.innerHeight;

    if (ancho < ESCRITORIO) {
      return 'fondo';
    }
    if (caja.right < ancho * 0.45) {
      return 'derecha';
    }
    if (caja.left > ancho * 0.55) {
      return 'izquierda';
    }
    return caja.bottom < alto * 0.5 ? 'abajo' : 'arriba';
  }

  private hayNavegador(): boolean {
    return isPlatformBrowser(this.plataforma);
  }
}
