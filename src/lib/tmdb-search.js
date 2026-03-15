import { hasTmdbCredentials } from '@/lib/env';
import { getTmdbImageUrl, tmdbFetch } from '@/lib/tmdb';
const DEFAULT_GLOBAL_SEARCH_LIMIT = 48;
const DEFAULT_GLOBAL_SEARCH_PAGES = 2;
const searchCache = new Map();
const tvDetailCache = new Map();
const personDetailCache = new Map();
function getYearLabel(date) {
    const year = date?.slice(0, 4);
    return year && /^\d{4}$/.test(year) ? year : 'Date TBD';
}
function normalizeSearchText(value) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function tokenizeQuery(query) {
    return Array.from(new Set(normalizeSearchText(query).split(/\s+/).filter((token) => token.length >= 2)));
}
function getSearchImage(item) {
    if (item.media_type === 'person') {
        return item.profile_path ? getTmdbImageUrl(item.profile_path, 'w185') : '';
    }
    return item.poster_path ? getTmdbImageUrl(item.poster_path, 'w342') : '';
}
function buildPersonKnownForTitles(item) {
    return (item.known_for ?? [])
        .map((entry) => (entry.title ?? entry.name ?? '').trim())
        .filter(Boolean)
        .slice(0, 3);
}
function buildPersonSubtitle(item) {
    const department = item.known_for_department?.trim() || 'Person';
    const knownForTitles = buildPersonKnownForTitles(item);
    return knownForTitles.length > 0 ? `${department} • ${knownForTitles.join(' • ')}` : department;
}
function buildSearchText(result) {
    return normalizeSearchText([
        result.title,
        result.subtitle,
        result.metadataLine,
        result.knownForDepartment,
        ...(result.knownForTitles ?? []),
        result.overview,
    ]
        .filter(Boolean)
        .join(' '));
}
function getTitleMatchScore(title, normalizedQuery) {
    if (!normalizedQuery)
        return 0;
    if (title === normalizedQuery)
        return 1200;
    if (title.startsWith(normalizedQuery))
        return 800;
    if (title.includes(normalizedQuery))
        return 520;
    return 0;
}
function getTokenScore(text, title, tokens) {
    return tokens.reduce((score, token) => {
        if (title.startsWith(token))
            return score + 180;
        if (title.includes(token))
            return score + 110;
        if (text.includes(token))
            return score + 48;
        return score;
    }, 0);
}
function isRelevantResult(result, query) {
    const normalizedQuery = normalizeSearchText(query);
    const normalizedTitle = normalizeSearchText(result.title);
    const tokens = tokenizeQuery(query);
    const searchableText = buildSearchText(result);
    if (!normalizedQuery)
        return false;
    if (normalizedTitle.includes(normalizedQuery))
        return true;
    const titleTokenMatches = tokens.filter((token) => normalizedTitle.includes(token)).length;
    const anyTokenInSearchText = tokens.some((token) => searchableText.includes(token));
    if (tokens.length <= 1) {
        return anyTokenInSearchText;
    }
    return titleTokenMatches > 0 || tokens.filter((token) => searchableText.includes(token)).length >= Math.min(2, tokens.length);
}
function scoreResult(result, query) {
    const normalizedQuery = normalizeSearchText(query);
    const tokens = tokenizeQuery(query);
    const normalizedTitle = normalizeSearchText(result.title);
    const searchableText = buildSearchText(result);
    const exactScore = getTitleMatchScore(normalizedTitle, normalizedQuery);
    const tokenScore = getTokenScore(searchableText, normalizedTitle, tokens);
    const popularityScore = Math.log10((result.popularity ?? 0) + 1) * 28;
    const ratingScore = (result.score ?? 0) * 2;
    return Math.round(exactScore + tokenScore + popularityScore + ratingScore);
}
function mapSearchResult(item, query) {
    if (item.media_type === 'movie') {
        const yearLabel = getYearLabel(item.release_date);
        const resultBase = {
            id: item.id,
            mediaType: 'movie',
            title: item.title?.trim() || 'Untitled movie',
            subtitle: yearLabel,
            yearLabel,
            metadataLine: yearLabel,
            imageUrl: getSearchImage(item),
            overview: item.overview?.trim() || 'No synopsis available yet.',
            score: item.vote_average ? Number(item.vote_average.toFixed(1)) : undefined,
            popularity: item.popularity ?? 0,
        };
        if (!isRelevantResult(resultBase, query))
            return null;
        return { ...resultBase, relevanceScore: scoreResult(resultBase, query) };
    }
    if (item.media_type === 'tv') {
        const yearLabel = getYearLabel(item.first_air_date);
        const resultBase = {
            id: item.id,
            mediaType: 'tv',
            title: item.name?.trim() || 'Untitled series',
            subtitle: yearLabel,
            yearLabel,
            metadataLine: yearLabel,
            imageUrl: getSearchImage(item),
            overview: item.overview?.trim() || 'No series overview available yet.',
            score: item.vote_average ? Number(item.vote_average.toFixed(1)) : undefined,
            popularity: item.popularity ?? 0,
        };
        if (!isRelevantResult(resultBase, query))
            return null;
        return { ...resultBase, relevanceScore: scoreResult(resultBase, query) };
    }
    if (item.media_type === 'person') {
        const knownForDepartment = item.known_for_department?.trim() || 'Person';
        const knownForTitles = buildPersonKnownForTitles(item);
        const resultBase = {
            id: item.id,
            mediaType: 'person',
            title: item.name?.trim() || 'Unknown person',
            subtitle: buildPersonSubtitle(item),
            metadataLine: buildPersonSubtitle(item),
            knownForDepartment,
            knownForTitles,
            imageUrl: getSearchImage(item),
            overview: 'Open profile for credits, biography, and known-for titles.',
            popularity: item.popularity ?? 0,
        };
        if (!isRelevantResult(resultBase, query))
            return null;
        return { ...resultBase, relevanceScore: scoreResult(resultBase, query) };
    }
    return null;
}
function compareSearchResults(left, right) {
    const scoreDelta = right.relevanceScore - left.relevanceScore;
    if (scoreDelta !== 0)
        return scoreDelta;
    const popularityDelta = right.popularity - left.popularity;
    if (popularityDelta !== 0)
        return popularityDelta;
    const ratingDelta = (right.score ?? 0) - (left.score ?? 0);
    if (ratingDelta !== 0)
        return ratingDelta;
    return left.title.localeCompare(right.title);
}
export function getSearchResultTypeLabel(type) {
    if (type === 'movie')
        return 'Movie';
    if (type === 'tv')
        return 'TV Show';
    return 'Person';
}
export function getSearchResultHref(result) {
    if (result.mediaType === 'movie')
        return `/review/tmdb-${result.id}`;
    if (result.mediaType === 'tv')
        return `/tv/${result.id}`;
    return `/person/${result.id}`;
}
export async function searchTitlesAndPeople(query, limit = 8) {
    return searchGlobal(query, { limit, maxPages: 1 });
}
export async function searchGlobal(query, options = {}) {
    const normalizedQuery = query.trim();
    if (!normalizedQuery || !hasTmdbCredentials)
        return [];
    const limit = options.limit ?? DEFAULT_GLOBAL_SEARCH_LIMIT;
    const maxPages = Math.max(1, options.maxPages ?? DEFAULT_GLOBAL_SEARCH_PAGES);
    const cacheKey = `${normalizedQuery.toLowerCase()}:${limit}:${maxPages}`;
    if (!searchCache.has(cacheKey)) {
        searchCache.set(cacheKey, (async () => {
            const firstPage = await tmdbFetch('/search/multi', {
                query: {
                    include_adult: false,
                    language: 'en-US',
                    page: 1,
                    query: normalizedQuery,
                },
            });
            const pagesToLoad = Math.min(maxPages, Math.max(1, firstPage.total_pages));
            const extraPages = pagesToLoad > 1
                ? await Promise.all(Array.from({ length: pagesToLoad - 1 }, (_, index) => tmdbFetch('/search/multi', {
                    query: {
                        include_adult: false,
                        language: 'en-US',
                        page: index + 2,
                        query: normalizedQuery,
                    },
                })))
                : [];
            return [firstPage, ...extraPages]
                .flatMap((response) => response.results)
                .filter((item) => item.media_type === 'movie' || item.media_type === 'tv' || item.media_type === 'person')
                .map((item) => mapSearchResult(item, normalizedQuery))
                .filter((item) => Boolean(item))
                .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id && candidate.mediaType === item.mediaType) === index)
                .sort(compareSearchResults)
                .slice(0, limit);
        })());
    }
    return searchCache.get(cacheKey);
}
function buildTvSummary(details) {
    return {
        id: details.id,
        title: details.name,
        yearLabel: getYearLabel(details.first_air_date),
        posterUrl: details.poster_path ? getTmdbImageUrl(details.poster_path, 'w500') : '',
        backdropUrl: details.backdrop_path ? getTmdbImageUrl(details.backdrop_path, 'w1280') : '',
        overview: details.overview?.trim() || 'No overview available yet.',
        score: Number((details.vote_average ?? 0).toFixed(1)),
        genres: details.genres?.map((genre) => genre.name) ?? [],
    };
}
export async function fetchTvShowById(id) {
    if (!tvDetailCache.has(id)) {
        tvDetailCache.set(id, tmdbFetch(`/tv/${id}`, {
            query: { append_to_response: 'aggregate_credits' },
        }).then((details) => ({
            ...buildTvSummary(details),
            firstAirDate: details.first_air_date,
            lastAirDate: details.last_air_date,
            seasons: details.number_of_seasons ?? 0,
            episodes: details.number_of_episodes ?? 0,
            status: details.status?.trim() || 'Status unavailable',
            creators: details.created_by?.map((creator) => creator.name) ?? [],
            networks: details.networks?.map((network) => network.name) ?? [],
            cast: details.aggregate_credits?.cast
                ?.slice()
                .sort((left, right) => (right.total_episode_count ?? 0) - (left.total_episode_count ?? 0))
                .slice(0, 8)
                .map((person) => person.name) ?? [],
        })));
    }
    return tvDetailCache.get(id);
}
function mapPersonCredit(credit) {
    if (credit.media_type !== 'movie' && credit.media_type !== 'tv')
        return null;
    const title = credit.title?.trim() || credit.name?.trim();
    if (!title)
        return null;
    const date = credit.media_type === 'movie' ? credit.release_date : credit.first_air_date;
    return {
        id: credit.id,
        mediaType: credit.media_type,
        title,
        subtitle: getYearLabel(date),
        imageUrl: credit.poster_path
            ? getTmdbImageUrl(credit.poster_path, 'w342')
            : credit.backdrop_path
                ? getTmdbImageUrl(credit.backdrop_path, 'w780')
                : '',
    };
}
export async function fetchPersonById(id) {
    if (!personDetailCache.has(id)) {
        personDetailCache.set(id, tmdbFetch(`/person/${id}`, {
            query: { append_to_response: 'combined_credits' },
        }).then((details) => {
            const credits = [...(details.combined_credits?.cast ?? []), ...(details.combined_credits?.crew ?? [])]
                .sort((left, right) => {
                const popularityDelta = (right.popularity ?? 0) - (left.popularity ?? 0);
                if (popularityDelta !== 0)
                    return popularityDelta;
                return (right.vote_count ?? 0) - (left.vote_count ?? 0);
            })
                .map(mapPersonCredit)
                .filter((credit) => Boolean(credit));
            return {
                id: details.id,
                name: details.name,
                knownForDepartment: details.known_for_department?.trim() || 'Screen credits',
                biography: details.biography?.trim() || 'Biography not available yet.',
                birthday: details.birthday,
                placeOfBirth: details.place_of_birth?.trim() || 'Not available',
                imageUrl: details.profile_path ? getTmdbImageUrl(details.profile_path, 'h632') : '',
                backdropUrl: credits[0]?.imageUrl ?? '',
                knownFor: Array.from(new Map(credits.map((credit) => [`${credit.mediaType}-${credit.id}`, credit])).values()).slice(0, 10),
            };
        }));
    }
    return personDetailCache.get(id);
}
