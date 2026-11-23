export interface EstadoNfc {
  emisionActiva: boolean;
  reanudarAlReiniciar: boolean;
  toquesHoy: number;
  toquesTotales: number;
  tarjetaActiva: string;
  nombreTarjeta: string | null;
  fecha: string;
  nota: string | null;
}
