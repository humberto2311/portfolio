// Configuración de desarrollo.
// La URL real se puede inyectar en tiempo de ejecución desde assets/config.js
// (lo genera scripts/generate-env.js con la variable API_URL).
type ConfigRuntime = { apiUrl?: string };

function apiUrlDeRuntime(): string {
  if (typeof window === 'undefined') return '';
  const config = (window as unknown as { __APP_CONFIG__?: ConfigRuntime }).__APP_CONFIG__;
  return (config?.apiUrl ?? '').trim();
}

export const environment = {
  production: false,
  apiUrl: apiUrlDeRuntime() || 'http://localhost:8080'
};
