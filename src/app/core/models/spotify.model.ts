export interface PistaSpotify {
  id: string;
  nombre: string;
  artistas: string;
  album: string;
  imagenUrl: string | null;
  duracionMs: number;
  uri: string;
  url: string | null;
}

export interface EstadoSpotify {
  conectado: boolean;
  sonando: boolean;
  pista: PistaSpotify | null;
  progresoMs: number;
  dispositivo: string | null;
  volumen: number | null;
}
