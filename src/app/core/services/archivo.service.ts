import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';

/** Qué pasó con el archivo, para que cada pantalla escriba su propio aviso. */
export type ResultadoArchivo = 'compartido' | 'descargado' | 'cancelado';

/** Como `ResultadoArchivo`, pero sin descarga: 'no-soportado' pide copiar el enlace. */
export type ResultadoEnlace = 'compartido' | 'cancelado' | 'no-soportado';

/**
 * En el WebView de Android ni `navigator.share` ni `<a download>` existen:
 * el enlace descarga a una carpeta que el usuario no encuentra y el botón de
 * compartir queda invisible. Aquí se guarda en el caché de la app y se abre el
 * diálogo nativo, que es lo que permite adjuntar el .vcf a la agenda.
 *
 * Los plugins se cargan con `import()` dentro de la rama nativa: en el
 * prerrenderizado de SSR no existen `window` ni `document` y la sola carga del
 * módulo rompería el build.
 */
@Injectable({ providedIn: 'root' })
export class ArchivoService {
  readonly esNativa = Capacitor.isNativePlatform();

  /** Guarda el archivo en el teléfono o lo deja descargar en el navegador. */
  async guardar(blob: Blob, nombre: string, titulo?: string): Promise<ResultadoArchivo> {
    const archivo = nombreSeguro(nombre);

    if (this.esNativa) return this.guardarNativo(blob, archivo, titulo);
    return this.guardarWeb(blob, archivo);
  }

  async descargar(blob: Blob, nombre: string, titulo?: string): Promise<ResultadoArchivo> {
    const archivo = nombreSeguro(nombre);

    if (this.esNativa) return this.guardarNativo(blob, archivo, titulo);
    return this.bajarWeb(blob, archivo);
  }

  /**
   * Reparte un enlace por el selector nativo. En web devuelve 'no-soportado'
   * cuando el navegador no tiene Web Share, para que la pantalla copie el
   * enlace en su lugar.
   */
  async compartirEnlace(url: string, titulo: string): Promise<ResultadoEnlace> {
    if (this.esNativa) {
      const { Share } = await import('@capacitor/share');
      try {
        await Share.share({ url, title: titulo, dialogTitle: titulo });
        return 'compartido';
      } catch (e) {
        // Un fallo real del selector nativo se trata como "no soportado":
        // la pantalla copia el enlace y el usuario igual lo comparte.
        return cancelado(e) ? 'cancelado' : 'no-soportado';
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, url });
        return 'compartido';
      } catch (e) {
        return cancelado(e) ? 'cancelado' : 'no-soportado';
      }
    }

    return 'no-soportado';
  }

  private async guardarNativo(blob: Blob, nombre: string, titulo?: string): Promise<ResultadoArchivo> {
    const { Directory, Filesystem } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');

    const base64 = await this.aBase64(blob);
    const { uri } = await Filesystem.writeFile({
      path: nombre,
      data: base64,
      directory: Directory.Cache,
    });

    try {
      await Share.share({ files: [uri], dialogTitle: titulo ?? nombre });
      return 'compartido';
    } catch (e) {
      // Cancelar el diálogo no es un fallo: el archivo ya está escrito.
      if (cancelado(e)) return 'cancelado';
      throw e;
    }
  }

  private async guardarWeb(blob: Blob, nombre: string): Promise<ResultadoArchivo> {
    const nav = navigator as any;
    if (nav.canShare && nav.share) {
      try {
        const archivo = new File([blob], nombre, { type: blob.type });
        if (nav.canShare({ files: [archivo] })) {
          await nav.share({ files: [archivo], title: nombre });
          return 'compartido';
        }
      } catch {
        /* El usuario cerró el menú o el navegador no acepta archivos: se descarga. */
      }
    }

    return this.bajarWeb(blob, nombre);
  }

  private async bajarWeb(blob: Blob, nombre: string): Promise<ResultadoArchivo> {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
    return 'descargado';
  }

  private aBase64(blob: Blob): Promise<string> {
    return new Promise((resolver, rechazar) => {
      const lector = new FileReader();
      lector.onload = () => resolver(String(lector.result).split(',')[1] ?? '');
      lector.onerror = () => rechazar(new Error('No se pudo leer el archivo'));
      lector.readAsDataURL(blob);
    });
  }
}

/** Quita rutas y caracteres que Android rechaza al escribir el archivo. */
function nombreSeguro(nombre: string): string {
  const limpio = nombre.replace(/[\\/:*?"<>|]/g, '-').replace(/^\.+/, '').trim();
  return limpio || 'archivo';
}

/** Cerrar el diálogo «Compartir» no es un error, y el usuario no debe verlo como tal. */
function cancelado(e: any): boolean {
  return String(e?.message ?? e).toLowerCase().includes('cancel');
}
