export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w342";

export function getPosterUrl(path: string | null): string {
  if (!path) return "/placeholder-poster.png";
  return `${TMDB_IMAGE_BASE}${path}`;
}
