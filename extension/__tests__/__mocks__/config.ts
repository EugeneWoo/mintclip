export const API_CONFIG = {
  backendUrl: 'http://localhost:8000',
  webAppUrl: 'http://localhost:5173',
  environment: 'test',
} as const;

// Legacy alias kept for any tests that import `config` directly
export const config = API_CONFIG;

export default API_CONFIG;
