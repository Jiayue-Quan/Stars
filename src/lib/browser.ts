export async function shareUrl(url: string, title: string, text?: string) {
  if (typeof navigator !== 'undefined' && navigator.share) {
    await navigator.share({ url, title, text });
    return;
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return;
  }

  if (typeof window !== 'undefined') {
    window.prompt('Copy this link:', url);
  }
}

export function openExternalUrl(url: string) {
  if (typeof window === 'undefined') return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function buildYouTubeSearchUrl(query: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
