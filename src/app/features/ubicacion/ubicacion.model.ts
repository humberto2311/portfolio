export type TipoConexion = 'PERSONAL' | 'EMPRESARIAL';

export type SectorEmpresa =
  | 'Tecnología'
  | 'Restaurante'
  | 'Café'
  | 'Comercio'
  | 'Educación'
  | 'Salud'
  | 'Servicios';

export interface LocalRegistrado {
  id: string;
  nombre: string;
  sector: SectorEmpresa;
  servicio: string;
  ciudad: string;
  lugar: string;
  latitud: number;
  longitud: number;
  calificacion: number;
}

export interface ToqueUbicacion {
  tipo: TipoConexion;
  id: string;
  persona: string;
  empresa: string;
  iniciales: string;
  ciudad: string;
  lugar: string;
  latitud: number;
  longitud: number;
  fecha: string;
  toques: number;
  medio: 'NFC' | 'QR';
}

export const TOQUES_DEMO: ToqueUbicacion[] = [
  {
    id: 'u1',
    persona: 'Camila Restrepo',
    empresa: 'Nsoft',
    iniciales: 'CR',
    ciudad: 'Medellín',
    lugar: 'Café Aluna · El Poblado',
    latitud: 6.2088,
    longitud: -75.5674,
    fecha: '2026-11-06',
    toques: 7,
    medio: 'NFC',
    tipo: 'PERSONAL',
  },
  {
    id: 'u2',
    persona: 'Andrés Villalba',
    empresa: 'Verde Oliva',
    iniciales: 'AV',
    ciudad: 'Bogotá',
    lugar: 'Feria de emprendimiento · Corferias',
    latitud: 4.6288,
    longitud: -74.0895,
    fecha: '2026-11-04',
    toques: 3,
    medio: 'QR',
    tipo: 'EMPRESARIAL',
  },
  {
    id: 'u3',
    persona: 'Marcela Gómez',
    empresa: 'Aluna Café',
    iniciales: 'MG',
    ciudad: 'Cali',
    lugar: 'Coworking Zona Norte',
    latitud: 3.4706,
    longitud: -76.5312,
    fecha: '2026-10-28',
    toques: 11,
    medio: 'NFC',
    tipo: 'EMPRESARIAL',
  },
  {
    id: 'u4',
    persona: 'Julián Ospina',
    empresa: 'Sabor & Arte',
    iniciales: 'JO',
    ciudad: 'Medellín',
    lugar: 'Laureles · evento de networking',
    latitud: 6.2442,
    longitud: -75.5987,
    fecha: '2026-10-19',
    toques: 2,
    medio: 'QR',
    tipo: 'PERSONAL',
  },
  {
    id: 'u5',
    persona: 'Daniela Arango',
    empresa: 'Grupo Andino',
    iniciales: 'DA',
    ciudad: 'Barranquilla',
    lugar: 'Rueda de negocios · Puerta de Oro',
    latitud: 10.9685,
    longitud: -74.7813,
    fecha: '2026-10-12',
    toques: 5,
    medio: 'NFC',
    tipo: 'EMPRESARIAL',
  },
  {
    id: 'u6',
    persona: 'Santiago Mejía',
    empresa: 'Café del Sur',
    iniciales: 'SM',
    ciudad: 'Bucaramanga',
    lugar: 'Cámara de comercio · evento sectorial',
    latitud: 7.1193,
    longitud: -73.1227,
    fecha: '2026-09-30',
    toques: 4,
    medio: 'QR',
    tipo: 'PERSONAL',
  },
  {
    id: 'u7',
    persona: 'Valentina Ríos',
    empresa: 'Aluna Café',
    iniciales: 'VR',
    ciudad: 'Cartagena',
    lugar: 'Hotel boutique · desayuno de trabajo',
    latitud: 10.3910,
    longitud: -75.4794,
    fecha: '2026-09-22',
    toques: 6,
    medio: 'NFC',
    tipo: 'PERSONAL',
  },
  {
    id: 'u8',
    persona: 'Felipe Cárdenas',
    empresa: 'Nsoft',
    iniciales: 'FC',
    ciudad: 'Pereira',
    lugar: 'Coworking Eje Cafetero',
    latitud: 4.8133,
    longitud: -75.6961,
    fecha: '2026-09-08',
    toques: 3,
    medio: 'QR',
    tipo: 'EMPRESARIAL',
  },
];

export const LOCALES_DEMO: LocalRegistrado[] = [
  {
    id: 'l1',
    nombre: 'Nsoft · Oficina Medellín',
    sector: 'Tecnología',
    servicio: 'Desarrollo de software y tarjetas NFC',
    ciudad: 'Medellín',
    lugar: 'El Poblado',
    latitud: 6.2088,
    longitud: -75.5674,
    calificacion: 4.8,
  },
  {
    id: 'l2',
    nombre: 'Aluna Café · Laureles',
    sector: 'Café',
    servicio: 'Café de especialidad y métodos filtrados',
    ciudad: 'Medellín',
    lugar: 'Laureles',
    latitud: 6.2442,
    longitud: -75.5987,
    calificacion: 4.9,
  },
  {
    id: 'l3',
    nombre: 'Verde Oliva',
    sector: 'Restaurante',
    servicio: 'Cocina de mercado y catering',
    ciudad: 'Bogotá',
    lugar: 'Chapinero',
    latitud: 4.6483,
    longitud: -74.0662,
    calificacion: 4.6,
  },
  {
    id: 'l4',
    nombre: 'Taller Moto Andina',
    sector: 'Servicios',
    servicio: 'Mecánica y mantenimiento de motos',
    ciudad: 'Cali',
    lugar: 'Zona Norte',
    latitud: 3.4706,
    longitud: -76.5312,
    calificacion: 4.4,
  },
  {
    id: 'l5',
    nombre: 'Grupo Andino',
    sector: 'Comercio',
    servicio: 'Distribución mayorista y logística',
    ciudad: 'Barranquilla',
    lugar: 'Puerta de Oro',
    latitud: 10.9685,
    longitud: -74.7813,
    calificacion: 4.5,
  },
  {
    id: 'l6',
    nombre: 'Clínica Sonrisa Vital',
    sector: 'Salud',
    servicio: 'Odontología estética y general',
    ciudad: 'Bucaramanga',
    lugar: 'Cabecera del Llano',
    latitud: 7.1294,
    longitud: -73.1160,
    calificacion: 4.7,
  },
];

export const SECTORES: SectorEmpresa[] = [
  'Tecnología',
  'Restaurante',
  'Café',
  'Comercio',
  'Educación',
  'Salud',
  'Servicios',
];

export const CIUDADES_DEMO: { ciudad: string; latitud: number; longitud: number; toques: number }[] = [
  { ciudad: 'Medellín', latitud: 6.2442, longitud: -75.5812, toques: 19 },
  { ciudad: 'Bogotá', latitud: 4.6097, longitud: -74.0817, toques: 14 },
  { ciudad: 'Cali', latitud: 3.4516, longitud: -76.5320, toques: 11 },
];
