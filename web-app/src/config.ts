/**
 * Environment configuration for Mintclip webapp
 * Automatically detects production vs development environment
 */

// Detect if running in production (not localhost)
const isProduction = typeof window !== 'undefined' &&
                     window.location.hostname !== 'localhost' &&
                     window.location.hostname !== '127.0.0.1';

/**
 * Backend API URL - automatically switches between dev and prod
 * Production: https://mintclip-production.up.railway.app
 * Development: http://localhost:8000
 */
export const BACKEND_URL = isProduction
  ? 'https://mintclip-production.up.railway.app'  // Your Railway backend URL
  : 'http://localhost:8000';

console.log(`[Config] Environment: ${isProduction ? 'production' : 'development'}`);
console.log(`[Config] Backend URL: ${BACKEND_URL}`);
