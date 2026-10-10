// Single source of truth for build-time configuration.
//
// In a production build VITE_API_URL MUST be set. Falling back to localhost
// there would ship a site that silently calls the visitor's own machine, so
// we expose CONFIG_ERROR and let main.jsx show a clear message instead.
const raw = import.meta.env.VITE_API_URL;
export const CONFIG_ERROR = import.meta.env.PROD && !raw
  ? 'VITE_API_URL is not set for this deployment. Set it to the API base URL (e.g. https://api.example.com/api/v1) and redeploy.'
  : null;
export const API_BASE = (raw || 'http://localhost:3000/api/v1').replace(/\/+$/, '');
