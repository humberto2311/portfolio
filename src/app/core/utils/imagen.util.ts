const LADO_MAXIMO_AVATAR = 256;
const LADO_MAXIMO_PORTADA = 1280;
const CALIDAD = 0.72;

/**
 * Reduce una foto y la devuelve como data URL. El backend solo acepta
 * data URLs png/jpeg/webp, así que aquí se garantiza ese formato.
 */
export function imagenDePerfilComoDataUrl(archivo: File, tipo: 'avatar' | 'portada'): Promise<string> {
  const maxLado = tipo === 'avatar' ? LADO_MAXIMO_AVATAR : LADO_MAXIMO_PORTADA;

  return new Promise((resolver, rechazado) => {
    const lector = new FileReader();
    lector.onerror = () => rechazado(new Error('No se pudo leer el archivo'));
    lector.onload = async () => {
      try {
        const imagen = await crearImagen(String(lector.result));
        resolver(recortar(imagen, maxLado));
      } catch (e) {
        rechazado(e);
      } finally {
        lector.onload = null;
      }
    };
    lector.readAsDataURL(archivo);
  });
}

function crearImagen(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazado) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = () => rechazado(new Error('El archivo no es una imagen válida'));
    img.src = dataUrl;
  });
}

function recortar(imagen: HTMLImageElement, maxLado: number): string {
  const escala = Math.min(1, maxLado / Math.max(imagen.naturalWidth, imagen.naturalHeight));
  const ancho = Math.max(1, Math.round(imagen.naturalWidth * escala));
  const alto = Math.max(1, Math.round(imagen.naturalHeight * escala));

  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const contexto = lienzo.getContext('2d');
  if (!contexto) throw new Error('El navegador no permite procesar la imagen');

  contexto.drawImage(imagen, 0, 0, ancho, alto);

  const webp = lienzo.toDataURL('image/webp', CALIDAD);
  return webp.startsWith('data:image/webp') ? webp : lienzo.toDataURL('image/jpeg', CALIDAD);
}
