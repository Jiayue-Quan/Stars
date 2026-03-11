import type { SearchResultType } from '@/types';

export function getTypeBadgeClassName(mediaType: SearchResultType) {
  if (mediaType === 'movie') return 'border-[#d26d47]/30 bg-[#d26d47]/12 text-[#f4b684]';
  if (mediaType === 'tv') return 'border-sky-400/25 bg-sky-400/10 text-sky-100';
  return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100';
}
