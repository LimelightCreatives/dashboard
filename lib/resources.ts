// Shared helpers for resources. Kept out of the "use server" actions file,
// which can only export async functions.

const YOUTUBE_ID =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i;

/**
 * Thumbnail to show for a resource: the one an organiser set, otherwise one
 * derived from a YouTube link (any type). Returns null when there isn't one.
 */
export function thumbnailFor(r: { kind: string; url: string; thumbnailUrl: string }): string | null {
  if (r.thumbnailUrl) return r.thumbnailUrl;
  const id = YOUTUBE_ID.exec(r.url)?.[1];
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}