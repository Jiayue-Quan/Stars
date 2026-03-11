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
  results: TmdbMovieSummary[];
};

type BrowseFilters = {
  query?: string;
  genres?: string[];
  decades?: number[];
  minScore?: number;
  maxScore?: number;
  minRuntime?: number;
  maxRuntime?: number;
  sortBy?: 'newest' | 'oldest' | 'topRated' | 'popular';
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
const detailCache = new Map<number, Promise<{ movie: Movie; review: Review; similarMovies: Movie[] }>>();

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
    genres: genres.length ? genres : ['Drama'],
    verdict: scoreToVerdict(score),
    score,
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
  const hasSearch = Boolean(filters.query?.trim());

  const query: Record<string, string | number | boolean | undefined> = hasSearch
    ? {
        query: filters.query?.trim(),
        include_adult: false,
      }
    : {
        include_adult: false,
        sort_by:
          filters.sortBy === 'topRated'
            ? 'vote_average.desc'
            : filters.sortBy === 'oldest'
              ? 'primary_release_date.asc'
              : filters.sortBy === 'popular'
                ? 'popularity.desc'
                : 'primary_release_date.desc',
      };

  const response = hasSearch
    ? await tmdbFetch<TmdbListResponse>('/search/movie', { query })
    : await tmdbFetch<TmdbListResponse>('/discover/movie', { query });

  const mapped = response.results.map((movie) => mapSummaryMovie(movie, genreMap));

  return mapped
    .filter((movie) => (filters.genres?.length ? movie.genres.some((genre) => filters.genres?.includes(genre)) : true))
    .filter((movie) => (filters.decades?.length ? filters.decades.includes(movie.decade) : true))
    .filter((movie) => (filters.minScore !== undefined ? movie.score >= filters.minScore : true))
    .filter((movie) => (filters.maxScore !== undefined ? movie.score <= filters.maxScore : true))
    .slice(0, 30);
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
