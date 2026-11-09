/**
 * Genera la configuración de entorno en build.
 *
 * - src/assets/config.js: URL que el frontend lee en tiempo de ejecución
 *   (window.__APP_CONFIG__). Se carga desde index.html antes del bundle.
 * - src/environments/environment.prod.ts: se crea solo si no existe, para que
 *   `ng build --configuration production` funcione en un clon limpio
 *   (ese archivo está en .gitignore).
 *
 * Variables admitidas (Vercel → Settings → Environment Variables):
 *   API_URL       p. ej. https://mi-backend.up.railway.app
 *   BACKEND_URL   alternativa con el mismo fin
 *
 * Si no se define ninguna, config.js queda vacío y el front usa su valor por defecto.
 */
const fs = require('fs');
const path = require('path');

const apiUrl = (process.env.API_URL || process.env.BACKEND_URL || '')
  .trim()
  .replace(/\/+$/, '');

const API_POR_DEFECTO = 'https://sistema-backend-go5j.onrender.com';

function escribir(destino, contenido) {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, contenido, 'utf8');
}

const destinoConfig = path.join(__dirname, '..', 'src', 'assets', 'config.js');
escribir(
  destinoConfig,
  `// Archivo generado automáticamente por scripts/generate-env.js
window.__APP_CONFIG__ = {
  apiUrl: ${JSON.stringify(apiUrl)}
};
`,
);

const destinoEnv = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');
if (!fs.existsSync(destinoEnv)) {
  escribir(
    destinoEnv,
    `// Archivo generado automáticamente por scripts/generate-env.js
type ConfigRuntime = { apiUrl?: string };

function apiUrlDeRuntime(): string {
  if (typeof window === 'undefined') return '';
  const config = (window as unknown as { __APP_CONFIG__?: ConfigRuntime }).__APP_CONFIG__;
  return (config?.apiUrl ?? '').trim();
}

export const environment = {
  production: true,
  apiUrl: apiUrlDeRuntime() || ${JSON.stringify(apiUrl || API_POR_DEFECTO)}
};
`,
  );
}

console.log(`[generate-env] apiUrl = "${apiUrl || '(valor por defecto)'}" -> ${destinoConfig}`);
