/**
 * Extension Configuration
 * API configuration values
 *
 * Environment Detection:
 * - Development: Uses VITE_BACKEND_URL from .env (default: http://localhost:8000)
 * - Production: Set VITE_BACKEND_URL at build time for production
 */

// In development builds, VITE_MODE is set to 'development'
const isDevelopment = import.meta.env.MODE !== 'production';

const defaultBackendUrl = isDevelopment
  ? 'http://localhost:8000'
  : 'https://mintclip-api.railway.app'; // Backend API URL on Railway

const defaultWebAppUrl = isDevelopment
  ? 'http://127.0.0.1:5173'
  : 'https://mintclip-webapp.railway.app'; // Web app URL on Railway

// Alternative: Use environment variables at build time
// const defaultBackendUrl = isDevelopment
//   ? 'http://localhost:8000'
//   : import.meta.env.VITE_RAILWAY_BACKEND_URL || 'https://mintclip-api.railway.app';
//
// const defaultWebAppUrl = isDevelopment
//   ? 'http://127.0.0.1:5173'
//   : import.meta.env.VITE_RAILWAY_WEBAPP_URL || 'https://mintclip-webapp.railway.app';

export const API_CONFIG = {
  // Backend API URL for API operations
  backendUrl: import.meta.env.VITE_BACKEND_URL || defaultBackendUrl,

  // Web app URL for opening library
  webAppUrl: import.meta.env.VITE_WEBAPP_URL || defaultWebAppUrl,

  // Environment info for debugging
  environment: isDevelopment ? 'development' : 'production',
} as const;

// Log configuration on load (only in development)
if (isDevelopment) {
  console.log('[Config] Environment:', API_CONFIG.environment);
  console.log('[Config] Backend URL:', API_CONFIG.backendUrl);
  console.log('[Config] Web App URL:', API_CONFIG.webAppUrl);
}
