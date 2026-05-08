import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getImageUrl(path: string | undefined) {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  
  const baseUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}
