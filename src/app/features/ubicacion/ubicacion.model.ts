export interface ToqueUbicacion {
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
  },
];

export const CIUDADES_DEMO: { ciudad: string; latitud: number; longitud: number; toques: number }[] = [
  { ciudad: 'Medellín', latitud: 6.2442, longitud: -75.5812, toques: 19 },
  { ciudad: 'Bogotá', latitud: 4.6097, longitud: -74.0817, toques: 14 },
  { ciudad: 'Cali', latitud: 3.4516, longitud: -76.5320, toques: 11 },
];
