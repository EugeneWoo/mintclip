/**
 * Web App Configuration
 * Handles environment-specific settings
 *
 * Environment Variables:
 * - VITE_BACKEND_URL: Backend API URL (default: http://localhost:8000 for dev)
 */

const isDevelopment = import.meta.env.DEV;

// Default URLs for development
const defaultBackendUrl = 'http://localhost:8000';

// Get backend URL from environment or use default
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || defaultBackendUrl;

// Log configuration (only in development)
if (isDevelopment) {
  console.log('[Config] Environment:', isDevelopment ? 'development' : 'production');
  console.log('[Config] Backend URL:', BACKEND_URL);
}
