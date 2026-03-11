import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Film,
  Grid3X3,
  List,
  MessageSquareText,
  Search,
  SlidersHorizontal,
  Star,
  TrendingUp,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { FilterChips, MovieCard, PosterImage, VerdictBadge } from '@/components/ui-custom';
import { browseCountries, browseDecades, browseGenres, browseStreamingPlatforms } from '@/lib/movie-constants';
import { fetchBrowseMovies, fetchTrendingMovies } from '@/lib/tmdb-movies';
import { getUserLibrary, toggleLibraryItem } from '@/lib/user-library';
import type { Movie, SortOption, Verdict } from '@/types';

const verdicts: Verdict[] = ['Masterpiece', 'Essential', 'Recommended', 'Mixed', 'Skip'];
const yearBounds = [1940, new Date().getFullYear()] as const;

function BrowseCardSkeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
  if (viewMode === 'list') {
    return (
      <div className="flex gap-4 rounded-[1.35rem] border border-white/[0.06] bg-white/[0.03] p-4">
        <Skeleton className="h-32 w-24 rounded-xl bg-white/10" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-40 bg-white/10" />
          <Skeleton className="h-4 w-56 bg-white/10" />
          <Skeleton className="h-4 w-28 bg-white/10" />
          <Skeleton className="h-16 w-full bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Skeleton className="aspect-[2/3] rounded-[1.45rem] bg-white/10" />
      <Skeleton className="h-5 w-3/4 bg-white/10" />
      <Skeleton className="h-4 w-1/2 bg-white/10" />
      <div className="flex gap-2">
        <Skeleton className="h-7 w-16 rounded-full bg-white/10" />
        <Skeleton className="h-7 w-24 rounded-full bg-white/10" />
      </div>
    </div>
  );
}

export function Browse() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(true);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedVerdicts, setSelectedVerdicts] = useState<Verdict[]>([]);
  const [selectedDecades, setSelectedDecades] = useState<number[]>([]);
  const [selectedStreamingServices, setSelectedStreamingServices] = useState<string[]>([]);
  const [minRating, setMinRating] = useState([0]);
  const [yearRange, setYearRange] = useState([yearBounds[0], yearBounds[1]]);
  const [runtimeRange, setRuntimeRange] = useState([0, 240]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [exactYear, setExactYear] = useState('');
  const [directorQuery, setDirectorQuery] = useState('');
  const [castQuery, setCastQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<'basic' | 'advanced'>('basic');
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [browseMovies, setBrowseMovies] = useState<Movie[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [library, setLibrary] = useState(() => getUserLibrary());
  const [pageState, setPageState] = useState({ key: '', page: 1 });
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const refreshTimeoutRef = useRef<number | null>(null);
  const searchQuery = searchParams.get('q') ?? '';

  useEffect(() => {
    let cancelled = false;

    async function loadTrending() {
      try {
        const movies = await fetchTrendingMovies(5);
        if (!cancelled) {
          setTrendingMovies(movies);
        }
      } catch (error) {
        console.error('Failed to load trending movies', error);
        if (!cancelled) {
          setTrendingMovies([]);
        }
      }
    }

    void loadTrending();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const syncLibrary = () => setLibrary(getUserLibrary());
    window.addEventListener('stars:library-updated', syncLibrary);
    window.addEventListener('storage', syncLibrary);

    return () => {
      window.removeEventListener('stars:library-updated', syncLibrary);
      window.removeEventListener('storage', syncLibrary);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditableTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(target?.isContentEditable);

      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !isEditableTarget) {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeFiltersCount =
    selectedGenres.length +
    selectedVerdicts.length +
    selectedDecades.length +
    selectedStreamingServices.length +
    Number(Boolean(selectedCountry)) +
    Number(Boolean(exactYear)) +
    Number(Boolean(directorQuery.trim())) +
    Number(Boolean(castQuery.trim())) +
    Number(minRating[0] > 0) +
    Number(yearRange[0] !== yearBounds[0] || yearRange[1] !== yearBounds[1]) +
    Number(runtimeRange[0] > 0 || runtimeRange[1] < 240);

  const isDefaultBrowseState =
    !searchQuery.trim() &&
    activeFiltersCount === 0 &&
    sortBy === 'newest' &&
    viewMode === 'grid';

  const filterKey = JSON.stringify({
    castQuery,
    directorQuery,
    exactYear,
    minRating,
    runtimeRange,
    searchQuery,
    selectedCountry,
    selectedDecades,
    selectedGenres,
    selectedStreamingServices,
    selectedVerdicts,
    sortBy,
    viewMode,
    yearRange,
  });

  const currentPage = pageState.key === filterKey ? pageState.page : 1;

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadBrowseMovies() {
      if (currentPage > 1) {
        setIsLoadingMore(true);
      } else {
        setIsRefreshing(true);
      }
      setLoadError('');

      try {
        const response = await fetchBrowseMovies({
          query: searchQuery.trim() || undefined,
          genres: selectedGenres,
          decades: selectedDecades,
          minRating: minRating[0],
          releaseYearMin: yearRange[0],
          releaseYearMax: yearRange[1],
          exactYear: exactYear ? Number(exactYear) : undefined,
          minRuntime: runtimeRange[0],
          maxRuntime: runtimeRange[1],
          country: selectedCountry || undefined,
          streamingPlatforms: selectedStreamingServices,
          directorQuery: directorQuery.trim() || undefined,
          castQuery: castQuery.trim() || undefined,
          sortBy,
          page: currentPage,
        });

        if (!cancelled) {
          setBrowseMovies((current) => (currentPage > 1 ? [...current, ...response.movies] : response.movies));
          setTotalResults(response.totalResults);
          setTotalPages(response.totalPages);
        }
      } catch (error) {
        console.error('Failed to load browse movies', error);
        if (!cancelled) {
          if (currentPage === 1) {
            setBrowseMovies([]);
            setTotalResults(0);
          }
          setLoadError('TMDB browse is currently unavailable.');
        }
      } finally {
        if (!cancelled) {
          setIsRefreshing(false);
          setIsLoadingMore(false);
        }
      }
    }

    void loadBrowseMovies();

    return () => {
      cancelled = true;
    };
  }, [
    castQuery,
    currentPage,
    directorQuery,
    exactYear,
    minRating,
    runtimeRange,
    searchQuery,
    selectedCountry,
    selectedDecades,
    selectedGenres,
    selectedStreamingServices,
    selectedVerdicts,
    sortBy,
    yearRange,
  ]);

  const triggerRefresh = () => {
    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = window.setTimeout(() => {
      refreshTimeoutRef.current = null;
    }, 180);
  };

  const resetResultWindow = () => {
    setPageState({ key: '', page: 1 });
    triggerRefresh();
  };

  const updateSearchQuery = (value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) {
      nextParams.set('q', value);
    } else {
      nextParams.delete('q');
    }
    setSearchParams(nextParams, { replace: true });
    resetResultWindow();
  };

  const visibleMovies = useMemo(
    () =>
      selectedVerdicts.length
        ? browseMovies.filter((movie) => selectedVerdicts.includes(movie.verdict))
        : browseMovies,
    [browseMovies, selectedVerdicts],
  );
  const canLoadMore = currentPage < totalPages && !isRefreshing && !isLoadingMore;

  const resetBrowseState = () => {
    setSelectedGenres([]);
    setSelectedVerdicts([]);
    setSelectedDecades([]);
    setSelectedStreamingServices([]);
    setMinRating([0]);
    setYearRange([yearBounds[0], yearBounds[1]]);
    setRuntimeRange([0, 240]);
    setSelectedCountry('');
    setExactYear('');
    setDirectorQuery('');
    setCastQuery('');
    setSortBy('newest');
    setViewMode('grid');
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('q');
    setSearchParams(nextParams, { replace: true });
    resetResultWindow();
  };

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    window.setTimeout(() => {
      setPageState({ key: filterKey, page: currentPage + 1 });
      setIsLoadingMore(false);
    }, 220);
  };

  const handleGenreClick = (genre: string) => {
    setSelectedGenres((current) => (current.includes(genre) ? current : [...current, genre]));
    setActiveFilterTab('basic');
    setShowFilters(true);
    resetResultWindow();
  };

  const handleToggleWatchlist = (movieId: string) => {
    const nextState = toggleLibraryItem('watchlist', movieId);
    setLibrary(nextState);
  };

  const handleToggleLike = (movieId: string) => {
    const nextState = toggleLibraryItem('favorites', movieId);
    setLibrary(nextState);
  };

  const renderFilters = () => (
    <>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeFiltersCount ? `${activeFiltersCount} active` : 'All filters cleared'}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={resetBrowseState}
          disabled={isDefaultBrowseState}
          className="border-white/10 bg-white/[0.03] hover:bg-white/5"
        >
          Clear All
        </Button>
      </div>

      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveFilterTab('basic')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${activeFilterTab === 'basic' ? 'text-white' : 'text-muted-foreground'}`}
          style={activeFilterTab === 'basic' ? { background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(185, 28, 28, 0.2) 100%)' } : { background: 'rgba(255,255,255,0.05)' }}
        >
          Basic
        </button>
        <button
          type="button"
          onClick={() => setActiveFilterTab('advanced')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${activeFilterTab === 'advanced' ? 'text-white' : 'text-muted-foreground'}`}
          style={activeFilterTab === 'advanced' ? { background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(185, 28, 28, 0.2) 100%)' } : { background: 'rgba(255,255,255,0.05)' }}
        >
          Advanced
        </button>
      </div>

      <div className="mb-6">
        <label className="mb-3 block text-mono text-xs uppercase tracking-wider text-muted-foreground">Genre</label>
        <FilterChips
          options={browseGenres}
          selected={selectedGenres}
          onChange={(nextGenres) => {
            setSelectedGenres(nextGenres);
            resetResultWindow();
          }}
        />
      </div>

      <div className="mb-6">
        <label className="mb-3 flex items-center gap-2 text-mono text-xs uppercase tracking-wider text-muted-foreground">
          <Calendar className="h-3 w-3" /> Decade
        </label>
        <div className="flex flex-wrap gap-2">
          {browseDecades.map((decade) => (
            <button
              key={decade}
              type="button"
              onClick={() => {
                setSelectedDecades((current) =>
                  current.includes(decade) ? current.filter((value) => value !== decade) : [...current, decade],
                );
                resetResultWindow();
              }}
              className={`filter-chip ${selectedDecades.includes(decade) ? 'active' : ''}`}
            >
              {decade}s
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="mb-3 block text-mono text-xs uppercase tracking-wider text-muted-foreground">Country</label>
        <select
          value={selectedCountry}
          onChange={(event) => {
            setSelectedCountry(event.target.value);
            resetResultWindow();
          }}
          className="input-cinematic w-full py-2 text-sm"
        >
          <option value="">Any country</option>
          {browseCountries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <label className="mb-3 block text-mono text-xs uppercase tracking-wider text-muted-foreground">Streaming Service</label>
        <FilterChips
          options={browseStreamingPlatforms.map((platform) => platform.label)}
          selected={selectedStreamingServices}
          onChange={(services) => {
            setSelectedStreamingServices(services);
            resetResultWindow();
          }}
        />
      </div>

      {activeFilterTab === 'advanced' && (
        <>
          <div className="mb-6">
            <label className="mb-3 block text-mono text-xs uppercase tracking-wider text-muted-foreground">
              Minimum Rating: {minRating[0].toFixed(1)}
            </label>
            <Slider
              value={minRating}
              onValueChange={(value) => {
                setMinRating(value);
                resetResultWindow();
              }}
              min={0}
              max={10}
              step={0.1}
              className="w-full"
            />
          </div>

          <div className="mb-6">
            <label className="mb-3 block text-mono text-xs uppercase tracking-wider text-muted-foreground">
              Release Year Range: {yearRange[0]} - {yearRange[1]}
            </label>
            <Slider
              value={yearRange}
              onValueChange={(value) => {
                setYearRange(value);
                resetResultWindow();
              }}
              min={yearBounds[0]}
              max={yearBounds[1]}
              step={1}
              className="w-full"
            />
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-3 block text-mono text-xs uppercase tracking-wider text-muted-foreground">Exact Year</label>
              <Input
                inputMode="numeric"
                placeholder="e.g. 1999"
                value={exactYear}
                onChange={(event) => {
                  setExactYear(event.target.value.replace(/[^\d]/g, '').slice(0, 4));
                  resetResultWindow();
                }}
                className="input-cinematic"
              />
            </div>

            <div>
              <label className="mb-3 block text-mono text-xs uppercase tracking-wider text-muted-foreground">Director</label>
              <Input
                placeholder="Search director"
                value={directorQuery}
                onChange={(event) => {
                  setDirectorQuery(event.target.value);
                  resetResultWindow();
                }}
                className="input-cinematic"
              />
            </div>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-3 block text-mono text-xs uppercase tracking-wider text-muted-foreground">Top Cast</label>
              <Input
                placeholder="Search cast"
                value={castQuery}
                onChange={(event) => {
                  setCastQuery(event.target.value);
                  resetResultWindow();
                }}
                className="input-cinematic"
              />
            </div>

            <div>
              <label className="mb-3 block text-mono text-xs uppercase tracking-wider text-muted-foreground">
                Runtime: {runtimeRange[0]} - {runtimeRange[1]} min
              </label>
              <Slider
                value={runtimeRange}
                onValueChange={(value) => {
                  setRuntimeRange(value);
                  resetResultWindow();
                }}
                min={0}
                max={240}
                step={5}
                className="w-full pt-3"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-3 block text-mono text-xs uppercase tracking-wider text-muted-foreground">Verdict</label>
            <div className="flex flex-wrap gap-2">
              {verdicts.map((verdict) => (
                <button
                  key={verdict}
                  type="button"
                  onClick={() => {
                    setSelectedVerdicts((current) =>
                      current.includes(verdict) ? current.filter((value) => value !== verdict) : [...current, verdict],
                    );
                    resetResultWindow();
                  }}
                  className={`filter-chip ${selectedVerdicts.includes(verdict) ? 'active' : ''}`}
                >
                  {verdict}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );

  const showSkeletons = isRefreshing;
  const resultSummary = `Showing ${visibleMovies.length} of ${totalResults.toLocaleString()} movies`;
  const resultCaption =
    totalResults > 0
      ? `TMDB results, page ${currentPage} of ${Math.max(1, totalPages)}`
      : 'TMDB live catalog';

  return (
    <div className="min-h-screen pt-16">
      <div className="animated-bg" />
      <div className="flex flex-col lg:flex-row">
        {showFilters && (
          <aside
            className="hidden border-r border-white/[0.06] p-5 lg:sticky lg:top-16 lg:block lg:h-[calc(100vh-64px)] lg:w-80 lg:flex-shrink-0 lg:overflow-y-auto"
            style={{ background: 'rgba(10, 10, 15, 0.9)', backdropFilter: 'blur(20px)' }}
          >
            {renderFilters()}
          </aside>
        )}

        <main className="flex-1 p-4 sm:p-6">
          <div className="mb-6 rounded-[1.8rem] border border-white/[0.08] p-5 sm:p-6" style={{ background: 'linear-gradient(135deg, rgba(23, 17, 18, 0.92) 0%, rgba(17, 16, 27, 0.92) 100%)', backdropFilter: 'blur(18px)' }}>
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h1 className="heading-display text-3xl">Browse Movies</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {showSkeletons ? 'Refreshing results from the full catalog...' : resultSummary}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/45">{resultCaption}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="border-white/10 hover:bg-white/5">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  {showFilters ? 'Hide' : 'Show'} Filters
                </Button>
                <Button variant="outline" size="sm" onClick={resetBrowseState} disabled={isDefaultBrowseState} className="border-white/10 hover:bg-white/5">
                  Clear All Filters
                </Button>
                <select
                  value={sortBy}
                  onChange={(event) => {
                    setSortBy(event.target.value as SortOption);
                    resetResultWindow();
                  }}
                  className="input-cinematic py-2 text-sm"
                >
                  <option value="newest">Newest First</option>
                  <option value="highestRated">Highest Rated</option>
                  <option value="mostPopular">Most Popular</option>
                  <option value="releaseDate">Release Date</option>
                  <option value="mostReviewed">Most Reviewed</option>
                </select>
                <div className="flex overflow-hidden rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('grid');
                      resetResultWindow();
                    }}
                    className={`flex items-center gap-2 px-3 py-2.5 text-sm ${viewMode === 'grid' ? '' : 'hover:bg-white/5'}`}
                    style={viewMode === 'grid' ? { background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' } : {}}
                  >
                    <Grid3X3 className="h-4 w-4" />
                    Grid View
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('list');
                      resetResultWindow();
                    }}
                    className={`flex items-center gap-2 px-3 py-2.5 text-sm ${viewMode === 'list' ? '' : 'hover:bg-white/5'}`}
                    style={viewMode === 'list' ? { background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' } : {}}
                  >
                    <List className="h-4 w-4" />
                    List View
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="search-input-shell flex-1">
                <Search className="search-input-icon" />
                <Input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Search title, cast, director, synopsis, genre..."
                  value={searchQuery}
                  onChange={(event) => updateSearchQuery(event.target.value)}
                  className="input-cinematic search-input-field search-input-field-with-action h-12"
                />
                <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
                  {searchQuery && (
                    <button type="button" onClick={() => updateSearchQuery('')} aria-label="Clear search">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
                    /
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
                {activeFiltersCount ? `${activeFiltersCount} filters active` : 'Default browse state'}
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="mb-6 rounded-2xl border border-white/[0.06] p-4 sm:p-5 lg:hidden" style={{ background: 'rgba(10, 10, 15, 0.85)', backdropFilter: 'blur(20px)' }}>
              {renderFilters()}
            </div>
          )}

          {loadError && (
            <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
              {loadError}
            </div>
          )}

          {isDefaultBrowseState && trendingMovies.length > 0 && (
            <section className="mb-8 rounded-[1.8rem] border border-white/[0.08] p-5 sm:p-6" style={{ background: 'linear-gradient(135deg, rgba(40, 18, 16, 0.88) 0%, rgba(16, 14, 22, 0.92) 100%)', backdropFilter: 'blur(18px)' }}>
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="mb-1 flex items-center gap-2 text-mono text-xs uppercase tracking-[0.28em] text-[#f4b684]">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Trending This Week
                  </p>
                  <h2 className="text-2xl font-semibold">What movie fans are pulling up right now</h2>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {trendingMovies.map((movie, index) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    variant="compact"
                    showRank={index + 1}
                    onClick={() => navigate(`/review/${movie.id}`)}
                    onViewDetails={() => navigate(`/review/${movie.id}`)}
                    onWriteReview={() => navigate(`/review/${movie.id}?compose=1`)}
                    onToggleWatchlist={() => handleToggleWatchlist(movie.id)}
                    onToggleLike={() => handleToggleLike(movie.id)}
                    isInWatchlist={library.watchlist.includes(movie.id)}
                    isLiked={library.favorites.includes(movie.id)}
                    onGenreClick={handleGenreClick}
                  />
                ))}
              </div>
            </section>
          )}

          {showSkeletons ? (
            <div className={`grid gap-5 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'}`}>
              {Array.from({ length: viewMode === 'grid' ? 10 : 6 }).map((_, index) => (
                <BrowseCardSkeleton key={index} viewMode={viewMode} />
              ))}
            </div>
          ) : visibleMovies.length > 0 ? (
            <>
              <div className={`grid gap-5 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'}`}>
                {visibleMovies.map((movie) =>
                  viewMode === 'grid' ? (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      variant="compact"
                      onClick={() => navigate(`/review/${movie.id}`)}
                      onViewDetails={() => navigate(`/review/${movie.id}`)}
                      onWriteReview={() => navigate(`/review/${movie.id}?compose=1`)}
                      onToggleWatchlist={() => handleToggleWatchlist(movie.id)}
                      onToggleLike={() => handleToggleLike(movie.id)}
                      isInWatchlist={library.watchlist.includes(movie.id)}
                      isLiked={library.favorites.includes(movie.id)}
                      onGenreClick={handleGenreClick}
                    />
                  ) : (
                    <div
                      key={movie.id}
                      onClick={() => navigate(`/review/${movie.id}`)}
                      className="flex cursor-pointer gap-4 rounded-[1.35rem] p-4 transition-all hover:scale-[1.01]"
                      style={{ background: 'rgba(20, 20, 28, 0.8)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
                    >
                      <div className="group relative h-32 w-24 flex-shrink-0 overflow-hidden rounded-xl sm:h-36">
                        <PosterImage src={movie.poster} title={movie.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        <div className="absolute inset-x-2 bottom-2 flex justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleToggleWatchlist(movie.id);
                            }}
                            className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${library.watchlist.includes(movie.id) ? 'border-[#d26d47]/40 bg-[#d26d47]/20 text-[#f4b684]' : 'border-white/15 bg-black/40 text-white'}`}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleToggleLike(movie.id);
                            }}
                            className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${library.favorites.includes(movie.id) ? 'border-[#d26d47]/40 bg-[#d26d47]/20 text-[#f4b684]' : 'border-white/15 bg-black/40 text-white'}`}
                          >
                            Like
                          </button>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="text-lg font-semibold">{movie.title}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {movie.year} / {movie.genres.slice(0, 3).join(' / ')}
                            </p>
                          </div>
                          <VerdictBadge verdict={movie.verdict} score={movie.score} size="sm" />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#d26d47]/25 bg-[#d26d47]/10 px-3 py-1 font-semibold text-[#f4b684]">
                            <Star className="h-3.5 w-3.5" />
                            Community {movie.score.toFixed(1)}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#f4b684]/20 bg-[#f4b684]/10 px-3 py-1 font-semibold text-[#f7c59e]">
                            <MessageSquareText className="h-3.5 w-3.5" />
                            {(movie.reviewCount ?? 0).toLocaleString()} reviews
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{movie.country}</span>
                          {movie.runtime > 0 && <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{movie.runtime} min</span>}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {movie.genres.slice(0, 4).map((genre) => (
                            <button
                              key={genre}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleGenreClick(genre);
                              }}
                              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-[#d26d47]/40 hover:text-[#f4b684]"
                            >
                              {genre}
                            </button>
                          ))}
                        </div>
                        <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{movie.synopsis}</p>
                      </div>
                    </div>
                  ),
                )}
              </div>

              {canLoadMore && (
                <div className="mt-8 flex justify-center">
                  <Button onClick={handleLoadMore} className="btn-primary min-w-40">
                    Load More
                  </Button>
                </div>
              )}

              {isLoadingMore && (
                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <BrowseCardSkeleton key={index} viewMode="grid" />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="py-20 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <Film className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">No movies found</h3>
              <p className="mb-2 text-muted-foreground">TMDB returned no matches for the current search and filters.</p>
              <p className="mb-6 text-sm text-white/45">Adjust the filters or clear the search to broaden the API query.</p>
              <Button onClick={resetBrowseState} className="btn-primary">
                Clear all filters
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
