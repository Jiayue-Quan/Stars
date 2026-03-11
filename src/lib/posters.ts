const FALLBACK_BG = "#120d0b";
const FALLBACK_FG = "#f7efe7";
const FALLBACK_ACCENT = "#d26d47";
const AMBIGUOUS_POSTER_URLS = new Set([
  "https://m.media-amazon.com/images/M/MV5BYzYyN2FiZmUtYWYzMy00MzViLWJkZTMtOGY1ZjgzNWMwN2YxXkEyXkFqcGc@._V1_.jpg",
  "https://m.media-amazon.com/images/M/MV5BMDIxMzBlZDktZjMxNy00ZGI4LTgxNDEtYWRlNzRjMjJmOGQ1XkEyXkFqcGc@._V1_.jpg",
  "https://m.media-amazon.com/images/M/MV5BODZhOWI1ODgtMzdiOS00YjNkLTgwOGUtYmIyZDg5ZmQwMzQ1XkEyXkFqcGc@._V1_.jpg",
  "https://m.media-amazon.com/images/M/MV5BYjk1ZDJlMmUtOWQ0Zi00MDM5LTk1OGYtODczNjFmMGYwZGVkXkEyXkFqcGc@._V1_.jpg",
]);

interface PosterSize {
  width?: number;
  height?: number;
}

export function getPosterFallback(title: string, size: PosterSize = {}): string {
  const width = size.width ?? 300;
  const height = size.height ?? 450;
  const words = title.split(" ");
  const midpoint = Math.ceil(words.length / 2);
  const lines = [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")].filter(Boolean);
  const textY = lines.length === 1 ? 286 : 272;
  const lineGap = 30;
  const titleMarkup = lines
    .map(
      (line, index) =>
        `<text x="50%" y="${textY + index * lineGap}" text-anchor="middle" fill="${FALLBACK_FG}" font-family="Oswald, Arial, sans-serif" font-size="24" letter-spacing="1">${escapeXml(
          line,
        )}</text>`,
    )
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 300 450">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1b1412"/>
          <stop offset="55%" stop-color="${FALLBACK_BG}"/>
          <stop offset="100%" stop-color="#0a0807"/>
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${FALLBACK_ACCENT}"/>
          <stop offset="100%" stop-color="#f4b684"/>
        </linearGradient>
      </defs>
      <rect width="300" height="450" rx="28" fill="url(#bg)"/>
      <rect x="24" y="24" width="252" height="402" rx="22" fill="none" stroke="rgba(255,255,255,0.12)"/>
      <circle cx="240" cy="70" r="72" fill="${FALLBACK_ACCENT}" opacity="0.14"/>
      <circle cx="72" cy="372" r="84" fill="#f4b684" opacity="0.08"/>
      <rect x="36" y="54" width="86" height="4" rx="2" fill="url(#accent)"/>
      <text x="36" y="82" fill="#c3b1a3" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="3">STARS</text>
      <text x="36" y="102" fill="#8f8177" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="2">POSTER COMING SOON</text>
      <g opacity="0.9">
        <rect x="93" y="136" width="114" height="86" rx="18" fill="rgba(255,255,255,0.04)" stroke="rgba(244,182,132,0.2)"/>
        <rect x="112" y="154" width="76" height="50" rx="10" fill="rgba(244,182,132,0.08)" stroke="rgba(244,182,132,0.25)"/>
        <circle cx="132" cy="171" r="6" fill="#f4b684"/>
        <path d="M120 196l18-16 14 12 13-10 15 14" fill="none" stroke="#f7efe7" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M100 146h100" stroke="rgba(244,182,132,0.16)" stroke-width="2"/>
      </g>
      <line x1="36" y1="246" x2="264" y2="246" stroke="rgba(244,182,132,0.22)"/>
      ${titleMarkup}
      <line x1="36" y1="336" x2="204" y2="336" stroke="rgba(244,182,132,0.22)"/>
      <text x="36" y="366" fill="#c3b1a3" font-family="IBM Plex Mono, monospace" font-size="11" letter-spacing="2">ARTWORK PENDING</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function isLikelyValidTmdbPath(posterUrl: string): boolean {
  try {
    const parsed = new URL(posterUrl);
    if (!parsed.hostname.includes("image.tmdb.org")) return true;

    const fileName = parsed.pathname.split("/").pop() ?? "";
    return /^[A-Za-z0-9]{10,}\.(jpg|jpeg|png|webp)$/i.test(fileName);
  } catch {
    return false;
  }
}

function isAmbiguousPosterUrl(posterUrl: string): boolean {
  return AMBIGUOUS_POSTER_URLS.has(posterUrl);
}

export function resolvePosterUrl(
  posterUrl: string | undefined,
  title: string,
  size: PosterSize = {},
): string {
  if (!posterUrl) return getPosterFallback(title, size);
  if (!posterUrl.startsWith("http")) return posterUrl;
  if (isAmbiguousPosterUrl(posterUrl)) return getPosterFallback(title, size);
  if (!isLikelyValidTmdbPath(posterUrl)) return getPosterFallback(title, size);
  return posterUrl;
}
