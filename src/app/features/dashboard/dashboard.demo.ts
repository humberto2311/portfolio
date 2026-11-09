import {
  ConexionReciente,
  DatosDashboard,
  SugerenciaNetworking,
  TipoGrafico,
} from './dashboard.model';

const TODOS: TipoGrafico[] = ['barras', 'columnas', 'lineas', 'area', 'torta'];

export const DASHBOARD_PERSONAL: DatosDashboard = {
  contexto: 'personal',
  titulo: 'Mi panel',
  subtitulo: 'Cómo se mueve tu perfil, tu portafolio y tus enlaces.',
  metricas: [
    { clave: 'visitas', etiqueta: 'Visitas al perfil', valor: 1284, variacion: 12.4, icono: 'fa-solid fa-eye' },
    { clave: 'tarjeta', etiqueta: 'Aperturas de tarjeta', valor: 342, variacion: 6.1, icono: 'fa-solid fa-id-card' },
    { clave: 'contactos', etiqueta: 'Contactos nuevos', valor: 48, variacion: -3.2, icono: 'fa-solid fa-user-group' },
    { clave: 'proyectos', etiqueta: 'Vistas de proyectos', valor: 861, variacion: 18.9, icono: 'fa-solid fa-diagram-project' },
  ],
  tarjetas: [
    {
      id: 'visitas-dia',
      titulo: 'Visitas por día',
      descripcion: 'Últimos 7 días',
      tipoGrafico: 'area',
      permitidos: TODOS,
      series: [
        { etiqueta: 'Lun', valor: 132 },
        { etiqueta: 'Mar', valor: 168 },
        { etiqueta: 'Mié', valor: 145 },
        { etiqueta: 'Jue', valor: 210 },
        { etiqueta: 'Vie', valor: 238 },
        { etiqueta: 'Sáb', valor: 176 },
        { etiqueta: 'Dom', valor: 215 },
      ],
    },
    {
      id: 'origen',
      titulo: 'De dónde llegan',
      descripcion: 'Canal de entrada al perfil',
      tipoGrafico: 'torta',
      permitidos: TODOS,
      series: [
        { etiqueta: 'NFC', valor: 412 },
        { etiqueta: 'QR', valor: 268 },
        { etiqueta: 'Enlace directo', valor: 351 },
        { etiqueta: 'Búsqueda', valor: 253 },
      ],
    },
    {
      id: 'enlaces',
      titulo: 'Clics en tus enlaces',
      descripcion: 'Hub personal',
      tipoGrafico: 'barras',
      permitidos: TODOS,
      series: [
        { etiqueta: 'Portafolio', valor: 184 },
        { etiqueta: 'GitHub', valor: 152 },
        { etiqueta: 'LinkedIn', valor: 96 },
        { etiqueta: 'WhatsApp', valor: 74 },
      ],
    },
  ],
};

export const DASHBOARD_EMPRESA: DatosDashboard = {
  contexto: 'empresa',
  titulo: 'Panel de la empresa',
  subtitulo: 'Resumen de la actividad de la empresa y de sus diseños publicados.',
  metricas: [
    { clave: 'visitas', etiqueta: 'Visitas al perfil', valor: 5240, variacion: 9.7, icono: 'fa-solid fa-eye' },
    { clave: 'disenos', etiqueta: 'Aperturas de diseños', valor: 1876, variacion: 21.3, icono: 'fa-solid fa-pen-ruler' },
    { clave: 'equipo', etiqueta: 'Miembros activos', valor: 9, variacion: 0, icono: 'fa-solid fa-users' },
    { clave: 'toques', etiqueta: 'Toques NFC', valor: 634, variacion: 14.2, icono: 'fa-solid fa-wifi' },
  ],
  tarjetas: [
    {
      id: 'empresa-visitas',
      titulo: 'Visitas de la empresa',
      descripcion: 'Últimas 6 semanas',
      tipoGrafico: 'columnas',
      permitidos: TODOS,
      series: [
        { etiqueta: 'S1', valor: 620 },
        { etiqueta: 'S2', valor: 740 },
        { etiqueta: 'S3', valor: 690 },
        { etiqueta: 'S4', valor: 880 },
        { etiqueta: 'S5', valor: 940 },
        { etiqueta: 'S6', valor: 1010 },
      ],
    },
    {
      id: 'empresa-disenos',
      titulo: 'Aperturas por diseño',
      descripcion: 'Menús, tarjetas y catálogos',
      tipoGrafico: 'barras',
      permitidos: TODOS,
      series: [
        { etiqueta: 'Menú del día', valor: 742 },
        { etiqueta: 'Tarjeta', valor: 518 },
        { etiqueta: 'Catálogo', valor: 386 },
        { etiqueta: 'Promo', valor: 230 },
      ],
    },
    {
      id: 'empresa-equipo',
      titulo: 'Aportes por persona',
      descripcion: 'Piezas creadas en el mes',
      tipoGrafico: 'torta',
      permitidos: TODOS,
      series: [
        { etiqueta: 'Ana', valor: 14 },
        { etiqueta: 'Luis', valor: 11 },
        { etiqueta: 'Marta', valor: 8 },
        { etiqueta: 'Jorge', valor: 5 },
      ],
    },
  ],
};

export const DASHBOARD_EMPLEADO: DatosDashboard = {
  contexto: 'empresa-personal',
  titulo: 'Mi actividad en la empresa',
  subtitulo: 'Lo que aportas al equipo y cómo se mueve lo que publicas aquí.',
  metricas: [
    { clave: 'piezas', etiqueta: 'Piezas creadas', valor: 24, variacion: 4.5, icono: 'fa-solid fa-shapes' },
    { clave: 'vistas', etiqueta: 'Vistas de mis piezas', valor: 986, variacion: 11.8, icono: 'fa-solid fa-eye' },
    { clave: 'aportes', etiqueta: 'Aportes al equipo', valor: 12, variacion: 0, icono: 'fa-solid fa-hands-helping' },
    { clave: 'compartidos', etiqueta: 'Enlaces compartidos', valor: 37, variacion: -1.4, icono: 'fa-solid fa-link' },
  ],
  tarjetas: [
    {
      id: 'mias-vistas',
      titulo: 'Vistas de mis piezas',
      descripcion: 'Últimos 7 días',
      tipoGrafico: 'lineas',
      permitidos: TODOS,
      series: [
        { etiqueta: 'Lun', valor: 84 },
        { etiqueta: 'Mar', valor: 112 },
        { etiqueta: 'Mié', valor: 96 },
        { etiqueta: 'Jue', valor: 148 },
        { etiqueta: 'Vie', valor: 162 },
        { etiqueta: 'Sáb', valor: 129 },
        { etiqueta: 'Dom', valor: 171 },
      ],
    },
    {
      id: 'mis-piezas',
      titulo: 'Mis piezas por tipo',
      descripcion: 'Qué es lo que más creas',
      tipoGrafico: 'torta',
      permitidos: TODOS,
      series: [
        { etiqueta: 'Menús', valor: 9 },
        { etiqueta: 'Tarjetas', valor: 6 },
        { etiqueta: 'Textos', valor: 5 },
        { etiqueta: 'HTML', valor: 4 },
      ],
    },
  ],
};

export const SUGERENCIAS_NETWORKING: SugerenciaNetworking[] = [
  {
    id: 's1',
    titulo: 'Llama a Camila Restrepo',
    detalle: 'Hiciste su toque hace 3 días y no has vuelto a escribirle.',
    etiqueta: 'Llamar',
    icono: 'fa-solid fa-phone',
  },
  {
    id: 's2',
    titulo: 'Sigue a Andrés Villalba',
    detalle: 'Trabaja en una empresa de tu sector y coincidieron en el evento del jueves.',
    etiqueta: 'Seguir',
    icono: 'fa-solid fa-user-plus',
  },
  {
    id: 's3',
    titulo: 'Escribe a Marcela Gómez',
    detalle: 'Abrió tu tarjeta tres veces esta semana y no le has respondido.',
    etiqueta: 'Escribir',
    icono: 'fa-solid fa-comment-dots',
  },
  {
    id: 's4',
    titulo: 'Agenda un café con Julián Ospina',
    detalle: 'Se toparon dos veces en la misma semana; buen momento para concretar.',
    etiqueta: 'Agendar',
    icono: 'fa-regular fa-calendar-check',
  },
  {
    id: 's5',
    titulo: 'Presenta a Laura con Daniel',
    detalle: 'Los dos buscan proveedores de diseño gráfico y ya hicieron toque contigo.',
    etiqueta: 'Presentar',
    icono: 'fa-solid fa-handshake',
  },
];

export const CONEXIONES_RECIENTES: ConexionReciente[] = [
  {
    id: 'c1',
    persona: 'Camila Restrepo',
    empresa: 'Nsoft',
    iniciales: 'CR',
    medio: 'NFC',
    toques: 7,
    ultimoToque: '2026-11-06',
    etiqueta: 'Llamar',
  },
  {
    id: 'c2',
    persona: 'Andrés Villalba',
    empresa: 'Verde Oliva',
    iniciales: 'AV',
    medio: 'QR',
    toques: 3,
    ultimoToque: '2026-11-04',
    etiqueta: 'Seguir',
  },
  {
    id: 'c3',
    persona: 'Marcela Gómez',
    empresa: 'Aluna Café',
    iniciales: 'MG',
    medio: 'NFC',
    toques: 11,
    ultimoToque: '2026-10-28',
    etiqueta: 'Escribir',
  },
  {
    id: 'c4',
    persona: 'Julián Ospina',
    empresa: 'Sabor & Arte',
    iniciales: 'JO',
    medio: 'QR',
    toques: 2,
    ultimoToque: '2026-10-19',
    etiqueta: 'Agendar',
  },
];
