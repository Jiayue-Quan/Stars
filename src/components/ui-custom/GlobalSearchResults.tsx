import { Film, Tv, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getSearchResultHref, getSearchResultTypeLabel } from '@/lib/tmdb-search';
import { getTypeBadgeClassName } from '@/lib/search-ui';
import { cn } from '@/lib/utils';
import type { SearchResult, SearchResultType } from '@/types';

export function SearchTypeIcon({ mediaType, className }: { mediaType: SearchResultType; className?: string }) {
  if (mediaType === 'movie') return <Film className={className} />;
  if (mediaType === 'tv') return <Tv className={className} />;
  return <UserRound className={className} />;
}

export function SearchResultRow({ result }: { result: SearchResult }) {
  const isPerson = result.mediaType === 'person';

  return (
    <Link
      to={getSearchResultHref(result)}
      className="group flex gap-4 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4 transition-all hover:border-white/15 hover:bg-white/[0.05]"
    >
      <div
        className={cn(
          'flex h-28 w-20 flex-none items-center justify-center overflow-hidden border border-white/10 bg-white/[0.04]',
          isPerson ? 'rounded-[1.4rem]' : 'rounded-[1.2rem]',
        )}
      >
        {result.imageUrl ? (
          <img
            src={result.imageUrl}
            alt={result.title}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <SearchTypeIcon mediaType={result.mediaType} className="h-7 w-7 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="line-clamp-1 text-lg font-semibold text-white group-hover:text-[#f4b684]">{result.title}</h2>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
              getTypeBadgeClassName(result.mediaType),
            )}
          >
            <SearchTypeIcon mediaType={result.mediaType} className="h-3 w-3" />
            {getSearchResultTypeLabel(result.mediaType)}
          </span>
          {result.yearLabel && (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
              {result.yearLabel}
            </span>
          )}
        </div>

        <p className="mt-2 text-sm text-[#f4cfb0]">{result.metadataLine}</p>
        {!isPerson && (
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/40">{getSearchResultTypeLabel(result.mediaType)}</p>
        )}
        {isPerson && result.knownForDepartment && (
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/40">{result.knownForDepartment}</p>
        )}
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{result.overview}</p>
      </div>
    </Link>
  );
}

export function SearchResultGridCard({ result }: { result: SearchResult }) {
  const isPerson = result.mediaType === 'person';

  return (
    <Link
      to={getSearchResultHref(result)}
      className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-white/8 bg-[linear-gradient(145deg,rgba(24,19,17,0.94),rgba(14,12,11,0.98))] transition-all hover:border-white/15 hover:-translate-y-0.5"
    >
      <div
        className={cn(
          'relative flex aspect-[2/3] w-full items-center justify-center overflow-hidden bg-white/[0.04]',
          isPerson ? 'rounded-b-[1.2rem]' : '',
        )}
      >
        {result.imageUrl ? (
          <img
            src={result.imageUrl}
            alt={result.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <SearchTypeIcon mediaType={result.mediaType} className="h-8 w-8 text-muted-foreground" />
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="line-clamp-2 min-h-[2.75rem] text-sm font-semibold text-white group-hover:text-[#f4b684]">
            {result.title}
          </p>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]',
              getTypeBadgeClassName(result.mediaType),
            )}
          >
            <SearchTypeIcon mediaType={result.mediaType} className="h-3 w-3" />
            {getSearchResultTypeLabel(result.mediaType)}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#f4cfb0]">{result.metadataLine}</p>
        <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted-foreground">{result.overview}</p>
      </div>
    </Link>
  );
}

export function SearchResultSkeleton() {
  return (
    <div className="flex gap-4 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
      <div className="h-28 w-20 rounded-[1.2rem] bg-white/10" />
      <div className="flex-1 space-y-3">
        <div className="h-5 w-1/3 rounded bg-white/10" />
        <div className="h-4 w-1/2 rounded bg-white/10" />
        <div className="h-4 w-1/4 rounded bg-white/10" />
        <div className="h-4 w-full rounded bg-white/10" />
      </div>
    </div>
  );
}
