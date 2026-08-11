import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns the backend base URL (no /api suffix).
 * Safe to use with api.armorray.com — strips /api from END only.
 *
 * Local:      http://localhost:5000/api  → http://localhost:5000
 * Production: https://api.armorray.com/api → https://api.armorray.com
 */
export function getBackendBaseUrl(): string {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return apiUrl.replace(/\/api$/, '');
}

export function getImageUrl(path: string | undefined) {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getBackendBaseUrl()}${normalizedPath}`;
}
