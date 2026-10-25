const fs = require('fs');
const path = require('path');

const apiUrl = process.env.API_URL;

if (!apiUrl) {
  console.error('❌ Falta la variable de entorno API_URL. Configúrala en Vercel → Settings → Environment Variables.');
  process.exit(1);
}

const content = `// Archivo generado automáticamente por config-env.js — NO editar a mano.
export const environment = {
  production: true,
  apiUrl: '${apiUrl}'
};
`;

const targetPath = path.join(__dirname, 'src/environments/environment.prod.ts');
fs.writeFileSync(targetPath, content, 'utf8');

console.log(`✔ environment.prod.ts generado con apiUrl = ${apiUrl}`);