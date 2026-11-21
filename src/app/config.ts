const configured = import.meta.env.VITE_API_URL as string | undefined;

export const API_URL = (configured ?? 'http://localhost:3000').replace(/\/+$/, '');
