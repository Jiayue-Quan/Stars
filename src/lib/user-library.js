const STORAGE_KEY = 'stars:user-library';
const defaultLibraryState = {
    watchlist: ['dune-part-two', 'anora', 'the-brutalist', 'wicked'],
    watched: ['the-substance', 'conclave'],
    favorites: ['dune-part-two', 'anora'],
};
function canUseStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}
export function getUserLibrary() {
    if (!canUseStorage())
        return defaultLibraryState;
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (!stored)
            return defaultLibraryState;
        const parsed = JSON.parse(stored);
        return {
            watchlist: parsed.watchlist ?? defaultLibraryState.watchlist,
            watched: parsed.watched ?? defaultLibraryState.watched,
            favorites: parsed.favorites ?? defaultLibraryState.favorites,
        };
    }
    catch {
        return defaultLibraryState;
    }
}
export function saveUserLibrary(state) {
    if (!canUseStorage())
        return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('stars:library-updated'));
}
export function toggleLibraryItem(list, movieId) {
    const state = getUserLibrary();
    const nextValues = state[list].includes(movieId)
        ? state[list].filter((id) => id !== movieId)
        : [...state[list], movieId];
    const nextState = {
        ...state,
        [list]: nextValues,
    };
    saveUserLibrary(nextState);
    return nextState;
}
