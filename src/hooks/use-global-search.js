import { useEffect, useMemo, useState } from 'react';
import { searchGlobal } from '@/lib/tmdb-search';
const minSearchLength = 2;
export function useGlobalSearch(rawQuery, options = {}) {
    const trimmedQuery = rawQuery.trim();
    const hasQuery = trimmedQuery.length >= minSearchLength;
    const limit = options.limit;
    const maxPages = options.maxPages;
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    useEffect(() => {
        let cancelled = false;
        if (!hasQuery)
            return;
        void Promise.resolve().then(() => {
            if (cancelled)
                return;
            setIsLoading(true);
            setErrorMessage('');
            return searchGlobal(trimmedQuery, { limit, maxPages })
                .then((nextResults) => {
                if (!cancelled) {
                    setResults(nextResults);
                }
            })
                .catch((error) => {
                console.error('Failed to run global search', error);
                if (!cancelled) {
                    setResults([]);
                    setErrorMessage('Search is temporarily unavailable.');
                }
            })
                .finally(() => {
                if (!cancelled) {
                    setIsLoading(false);
                }
            });
        });
        return () => {
            cancelled = true;
        };
    }, [hasQuery, limit, maxPages, trimmedQuery]);
    return useMemo(() => ({
        trimmedQuery,
        hasQuery,
        results: hasQuery ? results : [],
        isLoading: hasQuery ? isLoading : false,
        errorMessage: hasQuery ? errorMessage : '',
        minSearchLength,
    }), [errorMessage, hasQuery, isLoading, results, trimmedQuery]);
}
