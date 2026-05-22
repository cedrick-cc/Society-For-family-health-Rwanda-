import { API_BASE_URL } from '@/services/api';

/** Backend serves files at e.g. http://localhost:5000/uploads/... */
export function getProfileImageAbsoluteUrl(relativePath?: string | null): string | undefined {
  if (!relativePath) return undefined;
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`;
}
