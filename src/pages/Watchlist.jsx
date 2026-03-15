import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Clock, Filter, Grid3X3, Heart, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { MovieCard, PosterImage, VerdictBadge } from '@/components/ui-custom';
import { movies as localMovies } from '@/data/movies';
import { fetchMoviesByRouteIds } from '@/lib/tmdb-movies';
import { getUserLibrary } from '@/lib/user-library';
export function Watchlist() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('watchlist');
    const [viewMode, setViewMode] = useState('grid');
    const [library, setLibrary] = useState(() => getUserLibrary());
    const [loadedMovies, setLoadedMovies] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [underTwoHours, setUnderTwoHours] = useState(false);
    const [selectedVerdict, setSelectedVerdict] = useState('');
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
        let cancelled = false;
        async function loadMovies() {
            const ids = [...new Set([...library.watchlist, ...library.watched, ...library.favorites])];
            if (!ids.length) {
                setLoadedMovies([]);
                return;
            }
            setIsLoading(true);
            try {
                const localMatches = localMovies.filter((movie) => ids.includes(movie.id));
                const remoteMatches = await fetchMoviesByRouteIds(ids.filter((movieId) => movieId.startsWith('tmdb-')));
                const movieMap = new Map([...localMatches, ...remoteMatches].map((movie) => [movie.id, movie]));
                const movies = ids.map((id) => movieMap.get(id)).filter((movie) => Boolean(movie));
                if (!cancelled) {
                    setLoadedMovies(movies);
                }
            }
            catch (error) {
                console.error('Failed to load watchlist movies', error);
                if (!cancelled) {
                    setLoadedMovies([]);
                }
            }
            finally {
                if (!cancelled)
                    setIsLoading(false);
            }
        }
        void loadMovies();
        return () => {
            cancelled = true;
        };
    }, [library]);
    const tabMovies = useMemo(() => {
        const activeIds = activeTab === 'watchlist' ? library.watchlist : activeTab === 'watched' ? library.watched : library.favorites;
        return loadedMovies.filter((movie) => activeIds.includes(movie.id));
    }, [activeTab, library, loadedMovies]);
    const filteredMovies = useMemo(() => {
        let result = tabMovies;
        if (underTwoHours) {
            result = result.filter((movie) => movie.runtime > 0 && movie.runtime <= 120);
        }
        if (selectedVerdict) {
            result = result.filter((movie) => movie.verdict === selectedVerdict);
        }
        return result;
    }, [selectedVerdict, tabMovies, underTwoHours]);
    const tabs = [
        { id: 'watchlist', label: 'Watchlist', icon: Check, count: library.watchlist.length },
        { id: 'watched', label: 'Watched', icon: Clock, count: library.watched.length },
        { id: 'favorites', label: 'Favorites', icon: Heart, count: library.favorites.length },
    ];
    return (<div className="min-h-screen bg-background pt-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="heading-display text-3xl md:text-4xl">Your Watchlist</h1>
            <p className="mt-2 text-muted-foreground">Saved movies from the live TMDB feed and the full local browse catalog.</p>
          </div>

          <div className="flex overflow-hidden rounded-lg border border-white/10">
            <button type="button" onClick={() => setViewMode('grid')} className={`flex items-center gap-2 p-2.5 ${viewMode === 'grid' ? 'bg-primary text-white' : 'hover:bg-white/5'}`}>
              <Grid3X3 className="h-4 w-4"/>
              <span className="text-sm">Grid</span>
            </button>
            <button type="button" onClick={() => setViewMode('compact')} className={`flex items-center gap-2 p-2.5 ${viewMode === 'compact' ? 'bg-primary text-white' : 'hover:bg-white/5'}`}>
              <List className="h-4 w-4"/>
              <span className="text-sm">List</span>
            </button>
          </div>
        </div>

        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => (<button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 font-medium transition-all ${activeTab === tab.id ? 'bg-primary text-white' : 'bg-white/5 text-muted-foreground hover:bg-white/10'}`}>
              <tab.icon className="h-4 w-4"/>
              {tab.label}
              <span className={`rounded-full px-2 py-0.5 text-xs ${activeTab === tab.id ? 'bg-white/20' : 'bg-white/10'}`}>{tab.count}</span>
            </button>))}
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-4 rounded-2xl border border-white/[0.06] bg-card/40 p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="h-4 w-4"/>
            <span className="text-sm">Filters:</span>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={underTwoHours} onCheckedChange={setUnderTwoHours} id="runtime"/>
            <label htmlFor="runtime" className="cursor-pointer text-sm">Under 2 hours</label>
          </div>

          <select value={selectedVerdict} onChange={(event) => setSelectedVerdict(event.target.value)} className="rounded-lg border border-white/10 bg-secondary/50 px-3 py-1.5 text-sm">
            <option value="">All verdicts</option>
            {['Masterpiece', 'Essential', 'Recommended', 'Mixed', 'Skip'].map((verdict) => (<option key={verdict} value={verdict}>{verdict}</option>))}
          </select>
        </div>

        {isLoading ? (<div className="py-20 text-center text-muted-foreground">Loading saved movies...</div>) : filteredMovies.length > 0 ? (<div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'}`}>
            {filteredMovies.map((movie) => viewMode === 'grid' ? (<MovieCard key={movie.id} movie={movie} variant="compact" onClick={() => navigate(`/review/${movie.id}`)}/>) : (<div key={movie.id} onClick={() => navigate(`/review/${movie.id}`)} className="flex cursor-pointer gap-4 rounded-xl border border-white/[0.06] bg-card/40 p-4 hover:border-white/[0.12]">
                  <div className="h-24 w-16 flex-shrink-0 overflow-hidden rounded-lg">
                    <PosterImage src={movie.poster} title={movie.title} className="h-full w-full object-cover"/>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{movie.title}</h3>
                        <p className="text-sm text-muted-foreground">{movie.year}{movie.runtime ? ` - ${movie.runtime} min` : ''}</p>
                      </div>
                      <VerdictBadge verdict={movie.verdict} score={movie.score} size="sm"/>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{movie.synopsis}</p>
                  </div>
                </div>))}
          </div>) : (<div className="py-20 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
              <Check className="h-8 w-8 text-muted-foreground"/>
            </div>
            <h3 className="mb-2 text-xl font-semibold">
              {activeTab === 'watchlist' ? 'Your watchlist is empty' : activeTab === 'watched' ? 'No watched titles yet' : 'No favorite titles yet'}
            </h3>
            <p className="mb-6 text-muted-foreground">Save movies from Browse, Home, or Lists to populate this view.</p>
            <Button onClick={() => navigate('/browse')} className="btn-primary">Browse Movies</Button>
          </div>)}
      </div>
    </div>);
}
