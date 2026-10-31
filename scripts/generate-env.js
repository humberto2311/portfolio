/**
 * Genera src/assets/config.js con la URL del backend.
 *
 * Se ejecuta solo (prebuild) antes de `npm run build`.
 * Variables admitidas (en Vercel → Settings → Environment Variables):
 *   API_URL       p. ej. https://mi-backend.up.railway.app
 *   BACKEND_URL   alternativa con el mismo fin
 *
 * Si no se define ninguna, queda vacío y el front usa rutas relativas.
 */
const fs = require('fs');
const path = require('path');

const apiUrl = (process.env.API_URL || process.env.BACKEND_URL || '')
  .trim()
  .replace(/\/+$/, '');

const destino = path.join(__dirname, '..', 'src', 'assets', 'config.js');

const contenido = `// Archivo generado automáticamente por scripts/generate-env.js
window.__APP_CONFIG__ = {
  apiUrl: ${JSON.stringify(apiUrl)}
};
`;

fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, contenido, 'utf8');

console.log(`[generate-env] apiUrl = "${apiUrl || '(rutas relativas)'}" -> ${destino}`);
