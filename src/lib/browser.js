export async function shareUrl(url, title, text) {
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
export function openExternalUrl(url) {
    if (typeof window === 'undefined')
        return;
    window.open(url, '_blank', 'noopener,noreferrer');
}
export function buildYouTubeSearchUrl(query) {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
