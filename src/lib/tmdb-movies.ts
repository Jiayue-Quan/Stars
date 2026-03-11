import { browseStreamingPlatforms } from '@/lib/movie-constants';
import type { Movie, Review } from '@/types';
import { getTmdbImageUrl, tmdbFetch } from '@/lib/tmdb';

type TmdbGenre = {
  id: number;
  name: string;
};

type TmdbMovieSummary = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids?: number[];
  release_date?: string;
  vote_average: number;
  vote_count: number;
  popularity?: number;
  original_language?: string;
};

type TmdbMovieDetails = TmdbMovieSummary & {
  genres?: TmdbGenre[];
  runtime?: number | null;
  production_countries?: { iso_3166_1: string; name: string }[];
  spoken_languages?: { english_name: string; iso_639_1: string }[];
  credits?: {
    cast: { id: number; name: string }[];
    crew: { id: number; name: string; job: string }[];
  };
  videos?: {
    results: { key: string; site: string; type: string }[];
  };
  recommendations?: {
    results: TmdbMovieSummary[];
  };
};

type TmdbListResponse = {
  page: number;
  total_pages: number;
  total_results: number;
  results: TmdbMovieSummary[];
};

type TmdbPersonSearchResponse = {
  page: number;
  results: Array<{ id: number; name: string; known_for_department?: string }>;
};

type BrowseFilters = {
  query?: string;
  genres?: string[];
  decades?: number[];
  minRating?: number;
  releaseYearMin?: number;
  releaseYearMax?: number;
  exactYear?: number;
  minRuntime?: number;
  maxRuntime?: number;
  country?: string;
  streamingPlatforms?: string[];
  directorQuery?: string;
  castQuery?: string;
  page?: number;
  sortBy?: 'newest' | 'highestRated' | 'mostPopular' | 'releaseDate' | 'mostReviewed';
};

type BrowsePage = {
  movies: Movie[];
  page: number;
  totalPages: number;
  totalResults: number;
};

type HomeFeed = {
  spotlightMovie: Movie | null;
  latestMovies: Movie[];
  trendingMovies: Movie[];
  topRatedMovies: Movie[];
  popularMovies: Movie[];
};

type TmdbCollection = {
  id: string;
  title: string;
  description: string;
  endpoint: string;
};

const countryByLanguageCode: Record<string, string> = {
  en: 'USA',
  fr: 'France',
  de: 'Germany',
  ja: 'Japan',
  ko: 'South Korea',
  es: 'Spain',
  it: 'Italy',
  pt: 'Brazil',
};

const collectionDefinitions: TmdbCollection[] = [
  {
    id: 'trending-week',
    title: 'Trending This Week',
    description: 'The titles pulling the strongest attention on TMDB right now.',
    endpoint: '/trending/movie/week',
  },
  {
    id: 'now-playing',
    title: 'Now Playing',
    description: 'Live theatrical releases currently moving through the market.',
    endpoint: '/movie/now_playing',
  },
  {
    id: 'top-rated',
    title: 'Top Rated',
    description: "TMDB's highest-rated long-run film list.",
    endpoint: '/movie/top_rated',
  },
  {
    id: 'popular',
    title: 'Popular Worldwide',
    description: 'Broad audience favorites ranked by TMDB popularity.',
    endpoint: '/movie/popular',
  },
];

let genreMapPromise: Promise<Map<number, string>> | null = null;
let reverseGenreMapPromise: Promise<Map<string, number>> | null = null;
const detailCache = new Map<number, Promise<{ movie: Movie; review: Review; similarMovies: Movie[] }>>();
const browseMovieCache = new Map<number, Promise<Movie>>();
const personSearchCache = new Map<string, Promise<number[]>>();

const countryNameToCode: Record<string, string> = {
  USA: 'US',
  UK: 'GB',
  France: 'FR',
  Germany: 'DE',
  Japan: 'JP',
  'South Korea': 'KR',
  Spain: 'ES',
  Italy: 'IT',
  Canada: 'CA',
  Australia: 'AU',
  Brazil: 'BR',
  'New Zealand': 'NZ',
};

const providerLabelToId = new Map(browseStreamingPlatforms.map((platform) => [platform.label, platform.value]));

function toTmdbMovieId(id: number) {
  return `tmdb-${id}`;
}

function fromTmdbMovieId(id: string) {
  if (!id.startsWith('tmdb-')) return null;
  const parsed = Number(id.replace('tmdb-', ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function getReleaseYear(date?: string) {
  const year = Number((date ?? '0').slice(0, 4));
  return Number.isFinite(year) && year > 0 ? year : new Date().getFullYear();
}

function getDecade(year: number) {
  return Math.floor(year / 10) * 10;
}

function scoreToVerdict(score: number): Movie['verdict'] {
  if (score >= 8.8) return 'Masterpiece';
  if (score >= 7.8) return 'Essential';
  if (score >= 6.8) return 'Recommended';
  if (score >= 5.5) return 'Mixed';
  return 'Skip';
}

async function getGenreMap() {
  if (!genreMapPromise) {
    genreMapPromise = tmdbFetch<{ genres: TmdbGenre[] }>('/genre/movie/list').then((response) => {
      return new Map(response.genres.map((genre) => [genre.id, genre.name]));
    });
  }

  return genreMapPromise;
}

async function getReverseGenreMap() {
  if (!reverseGenreMapPromise) {
    reverseGenreMapPromise = getGenreMap().then((genreMap) => {
      return new Map(Array.from(genreMap.entries()).map(([id, name]) => [name.toLowerCase(), id]));
    });
  }

  return reverseGenreMapPromise;
}

function mapCountry(details?: TmdbMovieDetails, movie?: TmdbMovieSummary) {
  if (details?.production_countries?.[0]?.name) return details.production_countries[0].name;
  const code = movie?.original_language ?? 'en';
  return countryByLanguageCode[code] ?? code.toUpperCase();
}

function mapLanguage(details?: TmdbMovieDetails, movie?: TmdbMovieSummary) {
  if (details?.spoken_languages?.[0]?.english_name) return details.spoken_languages[0].english_name;
  const code = movie?.original_language ?? 'en';
  return countryByLanguageCode[code] ?? code.toUpperCase();
}

function mapSummaryMovie(movie: TmdbMovieSummary, genreMap: Map<number, string>): Movie {
  const year = getReleaseYear(movie.release_date);
  const score = Number(movie.vote_average.toFixed(1));
  const genres =
    movie.genre_ids
      ?.map((genreId) => genreMap.get(genreId))
      .filter((genre): genre is string => Boolean(genre)) ?? [];

  return {
    id: toTmdbMovieId(movie.id),
    source: 'tmdb',
    tmdbId: movie.id,
    title: movie.title,
    year,
    releaseDate: movie.release_date,
    genres: genres.length ? genres : ['Drama'],
    verdict: scoreToVerdict(score),
    score,
    reviewCount: movie.vote_count,
    popularity: movie.popularity,
    poster: movie.poster_path ? getTmdbImageUrl(movie.poster_path, 'w780') : '',
    backdrop: movie.backdrop_path ? getTmdbImageUrl(movie.backdrop_path, 'w1280') : '',
    director: 'TMDB',
    cast: [],
    runtime: 0,
    synopsis: movie.overview || 'No synopsis available yet.',
    country: mapCountry(undefined, movie),
    language: mapLanguage(undefined, movie),
    streaming: [],
    decade: getDecade(year),
  };
}

function buildTrailerUrl(details: TmdbMovieDetails) {
  const trailer = details.videos?.results.find((video) => video.site === 'YouTube' && video.type === 'Trailer');
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : undefined;
}

function mapDetailedMovie(details: TmdbMovieDetails, genreMap: Map<number, string>): Movie {
  const base = mapSummaryMovie(details, genreMap);
  const director = details.credits?.crew.find((person) => person.job === 'Director')?.name ?? 'Unknown Director';
  const cast = details.credits?.cast.slice(0, 5).map((person) => person.name) ?? [];

  return {
    ...base,
    genres: details.genres?.map((genre) => genre.name) ?? base.genres,
    runtime: details.runtime ?? 0,
    director,
    cast,
    country: mapCountry(details, details),
    language: mapLanguage(details, details),
    trailerUrl: buildTrailerUrl(details),
  };
}

async function searchPeopleIds(query: string, department: 'Directing' | 'Acting') {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const cacheKey = `${department}:${normalizedQuery}`;
  if (!personSearchCache.has(cacheKey)) {
    personSearchCache.set(
      cacheKey,
      tmdbFetch<TmdbPersonSearchResponse>('/search/person', {
        query: {
          query,
          page: 1,
          include_adult: false,
        },
      }).then((response) =>
        response.results
          .filter((person) =>
            department === 'Directing'
              ? person.known_for_department === 'Directing'
              : person.known_for_department === 'Acting',
          )
          .slice(0, 5)
          .map((person) => person.id),
      ),
    );
  }

  return personSearchCache.get(cacheKey)!;
}

async function fetchBrowseMovieDetails(tmdbId: number, genreMap: Map<number, string>) {
  if (!browseMovieCache.has(tmdbId)) {
    browseMovieCache.set(
      tmdbId,
      tmdbFetch<TmdbMovieDetails>(`/movie/${tmdbId}`, {
        query: { append_to_response: 'credits' },
      }).then((details) => mapDetailedMovie(details, genreMap)),
    );
  }

  return browseMovieCache.get(tmdbId)!;
}

function buildSyntheticReview(movie: Movie): Review {
  return {
    id: `${movie.id}-review`,
    movieId: movie.id,
    author: 'STARS Editorial Desk',
    date: new Date().toISOString().slice(0, 10),
    summary: movie.synopsis,
    pros: [
      `${movie.title} is coming directly from TMDB live data.`,
      `Audience score currently sits at ${movie.score.toFixed(1)}/10.`,
      movie.cast.length
        ? `Main cast includes ${movie.cast.slice(0, 3).join(', ')}.`
        : 'Cast metadata is available when TMDB provides credits.',
    ],
    cons: [
      'This page uses generated editorial copy until a custom review is written.',
      'Watch-provider data is not wired yet, so streaming badges stay minimal.',
    ],
    sections: {
      story: movie.synopsis,
      performances: movie.cast.length
        ? `${movie.cast.join(', ')} make up the principal cast listed in TMDB.`
        : 'Cast detail is limited for this title.',
      direction: `${movie.director} is credited as director in TMDB metadata.`,
      visuals: movie.backdrop
        ? 'Backdrop and poster art are being rendered directly from TMDB image assets.'
        : 'Poster and backdrop data are limited for this title.',
      sound: 'Sound commentary is generated placeholder copy pending authored review content.',
      themes: `${movie.genres.join(', ')} define the current genre and thematic profile for this title.`,
    },
    scoreBreakdown: {
      story: movie.score,
      performances: Math.max(5, Math.min(10, movie.score - 0.1)),
      direction: Math.max(5, Math.min(10, movie.score)),
      visuals: Math.max(5, Math.min(10, movie.score + 0.2)),
      sound: Math.max(5, Math.min(10, movie.score - 0.2)),
    },
  };
}

async function fetchList(endpoint: string, limit = 12) {
  const genreMap = await getGenreMap();
  const response = await tmdbFetch<TmdbListResponse>(endpoint);
  return response.results.slice(0, limit).map((movie) => mapSummaryMovie(movie, genreMap));
}

export async function fetchHomeFeed(): Promise<HomeFeed> {
  const [latestMovies, trendingMovies, topRatedMovies, popularMovies] = await Promise.all([
    fetchList('/movie/now_playing', 8),
    fetchList('/trending/movie/week', 8),
    fetchList('/movie/top_rated', 8),
    fetchList('/movie/popular', 8),
  ]);

  return {
    spotlightMovie: latestMovies[0] ?? trendingMovies[0] ?? topRatedMovies[0] ?? popularMovies[0] ?? null,
    latestMovies,
    trendingMovies,
    topRatedMovies,
    popularMovies,
  };
}

export async function fetchBrowseMovies(filters: BrowseFilters) {
  const genreMap = await getGenreMap();
  const page = filters.page ?? 1;

  const [reverseGenreMap, directorIds, castIds] = await Promise.all([
    getReverseGenreMap(),
    filters.directorQuery ? searchPeopleIds(filters.directorQuery, 'Directing') : Promise.resolve([]),
    filters.castQuery ? searchPeopleIds(filters.castQuery, 'Acting') : Promise.resolve([]),
  ]);

  const genreIds = (filters.genres ?? [])
    .map((genre) => reverseGenreMap.get(genre.toLowerCase()))
    .filter((genreId): genreId is number => typeof genreId === 'number');

  const providerIds = (filters.streamingPlatforms ?? [])
    .map((platform) => providerLabelToId.get(platform))
    .filter((providerId): providerId is string => Boolean(providerId));

  const sortBy =
    filters.sortBy === 'highestRated'
      ? 'vote_average.desc'
      : filters.sortBy === 'mostPopular'
        ? 'popularity.desc'
        : filters.sortBy === 'mostReviewed'
          ? 'vote_count.desc'
          : filters.sortBy === 'releaseDate'
            ? 'primary_release_date.asc'
            : 'primary_release_date.desc';

  if (filters.genres?.length && !genreIds.length) {
    return { movies: [], page: 1, totalPages: 1, totalResults: 0 } satisfies BrowsePage;
  }

  if (filters.directorQuery?.trim() && !directorIds.length) {
    return { movies: [], page: 1, totalPages: 1, totalResults: 0 } satisfies BrowsePage;
  }

  if (filters.castQuery?.trim() && !castIds.length) {
    return { movies: [], page: 1, totalPages: 1, totalResults: 0 } satisfies BrowsePage;
  }

  const hasPersonSearchConstraint =
    Boolean(filters.directorQuery?.trim() && directorIds.length) || Boolean(filters.castQuery?.trim() && castIds.length);

  const useSearchEndpoint = Boolean(filters.query?.trim()) && !hasPersonSearchConstraint && !genreIds.length && !(filters.streamingPlatforms?.length) && !filters.country;

  const query: Record<string, string | number | boolean | undefined> = useSearchEndpoint
    ? {
        query: filters.query?.trim(),
        include_adult: false,
        page,
      }
    : {
        include_adult: false,
        page,
        with_genres: genreIds.length ? genreIds.join('|') : undefined,
        with_cast: castIds.length ? castIds.join('|') : undefined,
        with_crew: directorIds.length ? directorIds.join('|') : undefined,
        'vote_count.gte': filters.minRating !== undefined && filters.minRating > 0 ? 50 : undefined,
        'vote_average.gte': filters.minRating !== undefined && filters.minRating > 0 ? filters.minRating : undefined,
        'primary_release_date.gte': filters.releaseYearMin ? `${filters.releaseYearMin}-01-01` : undefined,
        'primary_release_date.lte': filters.releaseYearMax ? `${filters.releaseYearMax}-12-31` : undefined,
        primary_release_year: filters.exactYear || undefined,
        'with_runtime.gte': filters.minRuntime || undefined,
        'with_runtime.lte': filters.maxRuntime && filters.maxRuntime < 240 ? filters.maxRuntime : undefined,
        with_origin_country: filters.country ? countryNameToCode[filters.country] : undefined,
        with_watch_providers: providerIds.length ? providerIds.join('|') : undefined,
        watch_region: providerIds.length ? 'US' : undefined,
        sort_by: sortBy,
      };

  const response = useSearchEndpoint
    ? await tmdbFetch<TmdbListResponse>('/search/movie', { query })
    : await tmdbFetch<TmdbListResponse>('/discover/movie', { query });

  const detailedMovies = await Promise.all(
    response.results.map((movie) => fetchBrowseMovieDetails(movie.id, genreMap).catch(() => mapSummaryMovie(movie, genreMap))),
  );

  const normalizedQuery = filters.query?.trim().toLowerCase();
  const filtered = detailedMovies
    .filter((movie) => (normalizedQuery
      ? [
          movie.title,
          movie.synopsis,
          movie.director,
          movie.country,
          movie.language,
          movie.genres.join(' '),
          movie.cast.join(' '),
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      : true))
    .filter((movie) => (filters.decades?.length ? filters.decades.includes(movie.decade) : true))
    .filter((movie) => (filters.exactYear ? movie.year === filters.exactYear : true))
    .filter((movie) =>
      filters.directorQuery?.trim()
        ? movie.director.toLowerCase().includes(filters.directorQuery.trim().toLowerCase())
        : true,
    )
    .filter((movie) =>
      filters.castQuery?.trim()
        ? movie.cast.some((member) => member.toLowerCase().includes(filters.castQuery!.trim().toLowerCase()))
        : true,
    );

  return {
    movies: filtered,
    page: response.page,
    totalPages: response.total_pages,
    totalResults: response.total_results,
  } satisfies BrowsePage;
}

export async function fetchTrendingMovies(limit = 6) {
  const genreMap = await getGenreMap();
  const response = await tmdbFetch<TmdbListResponse>('/trending/movie/week');
  return response.results.slice(0, limit).map((movie) => mapSummaryMovie(movie, genreMap));
}

export async function fetchTmdbMovieByRouteId(routeId: string) {
  const tmdbId = fromTmdbMovieId(routeId);
  if (!tmdbId) return null;

  if (detailCache.has(tmdbId)) {
    return detailCache.get(tmdbId)!;
  }

  const promise = (async () => {
    const genreMap = await getGenreMap();
    const details = await tmdbFetch<TmdbMovieDetails>(`/movie/${tmdbId}`, {
      query: { append_to_response: 'credits,videos,recommendations' },
    });

    const movie = mapDetailedMovie(details, genreMap);
    const similarMovies = (details.recommendations?.results ?? [])
      .slice(0, 6)
      .map((entry) => mapSummaryMovie(entry, genreMap));

    return {
      movie,
      review: buildSyntheticReview(movie),
      similarMovies,
    };
  })();

  detailCache.set(tmdbId, promise);
  return promise;
}

export async function fetchMoviesByRouteIds(routeIds: string[]) {
  const tmdbIds = routeIds.map(fromTmdbMovieId).filter((value): value is number => value !== null);
  if (!tmdbIds.length) return [];

  const movies = await Promise.all(tmdbIds.map((id) => fetchTmdbMovieByRouteId(toTmdbMovieId(id))));
  return movies.map((entry) => entry?.movie).filter((movie): movie is Movie => Boolean(movie));
}

export async function fetchTmdbCollections() {
  const collections = await Promise.all(
    collectionDefinitions.map(async (collection) => {
      const movies = await fetchList(collection.endpoint, 12);
      return { ...collection, movies };
    }),
  );

  return collections;
}

export function isTmdbMovieId(id: string) {
  return fromTmdbMovieId(id) !== null;
}
