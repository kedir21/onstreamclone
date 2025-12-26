
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Layout from './components/Layout';
import Row from './components/Row';
import Player from './components/Player';
import SourceSelector from './components/SourceSelector';
import { tmdbService } from './services/tmdbService';
import { extractorService } from './services/extractorService';
import { Movie, Episode, VideoSource, Genre, Cast } from './types';
import { IMAGE_BASE_URL } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [trending, setTrending] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [popularTV, setPopularTV] = useState<Movie[]>([]);
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  
  // Search & Pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [pages, setPages] = useState({ movies: 1, tv: 1, search: 1 });
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Genre state
  const [movieGenres, setMovieGenres] = useState<Genre[]>([]);
  const [tvGenres, setTvGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [isGenreMenuOpen, setIsGenreMenuOpen] = useState(false);

  // Details & Player state
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSourceSelectorOpen, setIsSourceSelectorOpen] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [activeSource, setActiveSource] = useState<VideoSource | null>(null);
  const [allSources, setAllSources] = useState<VideoSource[]>([]);
  const [seasonsData, setSeasonsData] = useState<Episode[]>([]);
  const [currentSeason, setCurrentSeason] = useState(1);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);
  
  const detailScrollRef = useRef<HTMLDivElement>(null);

  // Infinite Scroll Observer
  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLElement | null) => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore, activeTab]);

  useEffect(() => {
    const saved = localStorage.getItem('onstream_watchlist');
    if (saved) {
      try { setWatchlist(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  const toggleWatchlist = (movie: Movie) => {
    const isStored = watchlist.find(m => m.id === movie.id);
    let updated;
    if (isStored) {
      updated = watchlist.filter(m => m.id !== movie.id);
    } else {
      updated = [{ ...movie, media_type: movie.media_type || (movie.name ? 'tv' : 'movie') }, ...watchlist];
    }
    setWatchlist(updated);
    localStorage.setItem('onstream_watchlist', JSON.stringify(updated));
  };

  const isInWatchlist = (id: number) => watchlist.some(m => m.id === id);

  // Load initial data
  useEffect(() => {
    const init = async () => {
      try {
        const [t, mg, tg] = await Promise.all([
          tmdbService.fetchTrending(1),
          tmdbService.fetchGenres('movie'),
          tmdbService.fetchGenres('tv')
        ]);
        setTrending(t);
        setMovieGenres(mg);
        setTvGenres(tg);
      } catch (err) { console.error(err); }
    };
    init();
  }, []);

  // Fetch categorized data
  useEffect(() => {
    const refreshData = async () => {
      if (activeTab === 'watchlist' || (activeTab === 'search' && !searchQuery)) return;
      setLoadingMore(true);
      setHasMore(true);
      try {
        if (activeTab === 'movies') {
          const data = await tmdbService.fetchPopularMovies(1, selectedGenre || undefined);
          setPopularMovies(data);
          setPages(prev => ({ ...prev, movies: 1 }));
        } else if (activeTab === 'tv') {
          const data = await tmdbService.fetchPopularTV(1, selectedGenre || undefined);
          setPopularTV(data);
          setPages(prev => ({ ...prev, tv: 1 }));
        } else if (activeTab === 'home') {
          const [m, t] = await Promise.all([tmdbService.fetchPopularMovies(1), tmdbService.fetchPopularTV(1)]);
          setPopularMovies(m);
          setPopularTV(t);
        }
      } catch (err) { console.error(err); } finally { setLoadingMore(false); }
    };
    refreshData();
  }, [activeTab, selectedGenre]);

  const loadMore = async () => {
    if (loadingMore || activeTab === 'watchlist' || activeTab === 'home') return;
    setLoadingMore(true);
    try {
      if (activeTab === 'movies') {
        const nextPage = pages.movies + 1;
        const data = await tmdbService.fetchPopularMovies(nextPage, selectedGenre || undefined);
        if (data.length > 0) {
          setPopularMovies(prev => [...prev, ...data]);
          setPages(prev => ({ ...prev, movies: nextPage }));
        } else { setHasMore(false); }
      } else if (activeTab === 'tv') {
        const nextPage = pages.tv + 1;
        const data = await tmdbService.fetchPopularTV(nextPage, selectedGenre || undefined);
        if (data.length > 0) {
          setPopularTV(prev => [...prev, ...data]);
          setPages(prev => ({ ...prev, tv: nextPage }));
        } else { setHasMore(false); }
      } else if (activeTab === 'search') {
        const nextPage = pages.search + 1;
        const data = await tmdbService.search(searchQuery, nextPage);
        const filtered = data.filter(r => r.media_type === 'movie' || r.media_type === 'tv');
        if (filtered.length > 0) {
          setSearchResults(prev => [...prev, ...filtered]);
          setPages(prev => ({ ...prev, search: nextPage }));
        } else { setHasMore(false); }
      }
    } catch (err) { console.error(err); } finally { setLoadingMore(false); }
  };

  const openDetails = async (movie: Movie) => {
    try {
      const type = movie.media_type || (movie.name ? 'tv' : 'movie');
      const details = await tmdbService.fetchDetails(movie.id, type);
      setSelectedMovie(details);
      setIsDetailOpen(true);
      if (type === 'tv') {
        const episodes = await tmdbService.fetchSeasons(movie.id, 1);
        setSeasonsData(episodes || []);
        setCurrentSeason(1);
        setCurrentEpisode(1);
      }
      if (detailScrollRef.current) detailScrollRef.current.scrollTop = 0;
    } catch (e) { console.error(e); }
  };

  const startPlayback = (season?: number, episode?: number) => {
    if (season !== undefined) setCurrentSeason(season);
    if (episode !== undefined) setCurrentEpisode(episode);
    const sources = extractorService.getSources(selectedMovie.id, selectedMovie.seasons ? 'tv' : 'movie', season || currentSeason, episode || currentEpisode);
    setAllSources(sources);
    setActiveSource(sources[0]);
    setIsPlayerOpen(true);
  };

  const handleSourceSelect = (source: VideoSource) => {
    setActiveSource(source);
    setIsSourceSelectorOpen(false);
    setIsPlayerOpen(true);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoadingMore(true);
    setSearchResults([]);
    setPages(prev => ({ ...prev, search: 1 }));
    setHasMore(true);
    try {
      const results = await tmdbService.search(searchQuery, 1);
      setSearchResults(results.filter(r => r.media_type === 'movie' || r.media_type === 'tv'));
    } catch (err) { console.error(err); } finally { setLoadingMore(false); }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setHasMore(true);
    setSelectedGenre(null);
    setIsDetailOpen(false); // Close details when navigating away
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={handleTabChange}>
      <div className="pb-10">
        {activeTab === 'home' && (
          <>
            {trending[0] && (
              <div className="relative w-full h-[60vh] sm:h-[75vh] overflow-hidden group">
                <img src={`${IMAGE_BASE_URL}/original${trending[0].backdrop_path}`} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Banner" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/40 to-transparent flex flex-col justify-end px-6 md:px-12 pb-16 gap-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl">Top Recommendation</span>
                    <span className="text-gray-400 font-bold text-sm">★ {trending[0].vote_average.toFixed(1)}</span>
                  </div>
                  <h1 className="text-4xl sm:text-7xl font-black max-w-4xl leading-[0.9] tracking-tighter italic uppercase drop-shadow-2xl">{trending[0].title || trending[0].name}</h1>
                  <button onClick={() => openDetails(trending[0])} className="w-fit bg-white text-black hover:bg-blue-600 hover:text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl transition-all active:scale-95">Watch Trailer</button>
                </div>
              </div>
            )}
            <Row title="Now Playing" items={popularMovies} onItemClick={openDetails} />
            <Row title="Trending TV" items={popularTV} onItemClick={openDetails} />
            {watchlist.length > 0 && <Row title="Continue Watching" items={watchlist.slice(0, 10)} onItemClick={openDetails} />}
          </>
        )}

        {(activeTab === 'movies' || activeTab === 'tv' || activeTab === 'search') && (
           <div className="p-6 md:p-10">
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
               <h1 className="text-3xl md:text-5xl font-black tracking-tighter italic uppercase">{activeTab === 'search' ? 'Search' : activeTab}</h1>
               {(activeTab === 'movies' || activeTab === 'tv') && (
                 <div className="relative w-full sm:w-auto">
                   <button onClick={() => setIsGenreMenuOpen(!isGenreMenuOpen)} className="w-full sm:w-auto flex items-center justify-between gap-3 bg-white/5 border border-white/10 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                     {selectedGenre ? (activeTab === 'movies' ? movieGenres : tvGenres).find(g => g.id === selectedGenre)?.name : 'Filter By Genre'}
                     <svg className={`w-4 h-4 transition-transform ${isGenreMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth={3} /></svg>
                   </button>
                   {isGenreMenuOpen && (
                     <div className="absolute right-0 top-full mt-3 w-full sm:w-56 bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl z-[500] max-h-80 overflow-y-auto no-scrollbar p-2">
                       <button onClick={() => { setSelectedGenre(null); setIsGenreMenuOpen(false); }} className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 rounded-xl transition-colors">All Genres</button>
                       {(activeTab === 'movies' ? movieGenres : tvGenres).map(g => (
                         <button key={g.id} onClick={() => { setSelectedGenre(g.id); setIsGenreMenuOpen(false); }} className="w-full text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 rounded-xl transition-colors">{g.name}</button>
                       ))}
                     </div>
                   )}
                 </div>
               )}
             </div>

             {activeTab === 'search' && (
               <form onSubmit={handleSearch} className="mb-12">
                 <div className="relative group">
                   <input type="text" placeholder="Movies, TV Shows..." className="w-full bg-[#0a0a0a] border-2 border-white/5 focus:border-blue-600 rounded-3xl py-5 px-8 sm:py-6 sm:px-10 text-lg sm:text-xl outline-none font-black transition-all placeholder:text-gray-800" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus />
                   <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 p-3.5 sm:p-4 rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-transform"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth={3}/></svg></button>
                 </div>
               </form>
             )}

             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 md:gap-8">
               {(activeTab === 'movies' ? popularMovies : activeTab === 'tv' ? popularTV : searchResults).map((movie, idx) => {
                 const list = activeTab === 'movies' ? popularMovies : activeTab === 'tv' ? popularTV : searchResults;
                 const isLast = list.length === idx + 1;
                 return (
                   <button key={`${movie.id}-${idx}`} ref={isLast ? lastElementRef : null} onClick={() => openDetails(movie)} className="group flex flex-col gap-3 outline-none">
                      <div className="relative aspect-[2/3] rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden border border-white/5 bg-[#050505] shadow-2xl">
                        <img src={movie.poster_path ? `${IMAGE_BASE_URL}/w500${movie.poster_path}` : 'https://picsum.photos/400/600?grayscale'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xl scale-50 group-hover:scale-100 transition-transform"><svg className="w-5 h-5 sm:w-6 sm:h-6 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"/></svg></div>
                        </div>
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-black truncate uppercase text-white/50 group-hover:text-blue-500 tracking-tighter transition-colors">{movie.title || movie.name}</span>
                   </button>
                 );
               })}
             </div>
             {loadingMore && <div className="py-20 flex justify-center"><div className="w-10 h-10 border-4 border-white/5 border-t-blue-500 rounded-full animate-spin" /></div>}
           </div>
        )}

        {activeTab === 'watchlist' && (
          <div className="p-6 md:p-10">
             <h1 className="text-3xl md:text-4xl font-black tracking-tighter italic uppercase mb-12">My Collection</h1>
             {watchlist.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-40 opacity-20">
                 <svg className="w-20 h-20 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" strokeWidth={2}/></svg>
                 <p className="text-xs font-black uppercase tracking-[0.4em]">Collection is empty</p>
               </div>
             ) : (
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-8">
                 {watchlist.map((movie) => (
                   <button key={movie.id} onClick={() => openDetails(movie)} className="group flex flex-col gap-3 outline-none animate-in zoom-in-95 duration-300">
                     <div className="relative aspect-[2/3] rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden border border-white/5 bg-[#050505]">
                       <img src={movie.poster_path ? `${IMAGE_BASE_URL}/w500${movie.poster_path}` : 'https://picsum.photos/400/600'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                     </div>
                     <span className="text-[10px] sm:text-[11px] font-black truncate uppercase text-white/50 tracking-tighter">{movie.title || movie.name}</span>
                   </button>
                 ))}
               </div>
             )}
          </div>
        )}
      </div>

      {isDetailOpen && selectedMovie && (
        <div ref={detailScrollRef} className="fixed inset-0 z-[100] overflow-y-auto bg-[#050505] animate-in fade-in slide-in-from-bottom-10 duration-700 no-scrollbar pb-32">
          <div className="w-full min-h-screen relative">
            {/* Close Button Mobile Optimized */}
            <div className="absolute top-6 left-6 z-[120]">
              <button onClick={() => setIsDetailOpen(false)} className="p-3 sm:p-4 bg-black/60 text-white rounded-2xl sm:rounded-3xl backdrop-blur-3xl border border-white/10 hover:bg-white hover:text-black transition-all active:scale-90 shadow-2xl">
                <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
              </button>
            </div>

            {/* Hero Backdrop - Responsive Height */}
            <div className="absolute top-0 w-full h-[45vh] sm:h-[70vh] overflow-hidden">
              <img src={`${IMAGE_BASE_URL}/original${selectedMovie.backdrop_path}`} className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
            </div>

            <div className="relative p-6 sm:p-8 md:p-16 pt-40 sm:pt-64 flex flex-col gap-8 md:gap-10">
              <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-end">
                <div className="w-32 sm:w-48 md:w-64 flex-shrink-0 shadow-[0_40px_80px_rgba(0,0,0,0.8)] rounded-[2rem] sm:rounded-[3rem] overflow-hidden border border-white/10 aspect-[2/3] group hidden sm:block">
                  <img src={`${IMAGE_BASE_URL}/w500${selectedMovie.poster_path}`} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 space-y-3 sm:space-y-4">
                   <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                     <span className="text-blue-500 font-black text-[9px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] bg-blue-600/10 border border-blue-500/20 px-3 py-1 rounded-full">{selectedMovie.vote_average?.toFixed(1)} Rating</span>
                     <span className="text-gray-500 text-[9px] sm:text-xs font-black uppercase tracking-widest">{selectedMovie.release_date?.split('-')[0] || selectedMovie.first_air_date?.split('-')[0]}</span>
                     <span className="px-2 py-0.5 border border-white/20 rounded text-[8px] font-black text-gray-500 uppercase">4K UHD</span>
                   </div>
                   <h1 className="text-3xl sm:text-5xl md:text-8xl font-black leading-[0.9] tracking-tighter uppercase italic drop-shadow-2xl">{selectedMovie.title || selectedMovie.name}</h1>
                </div>
              </div>

              {/* Action Buttons - Stacked on Mobile */}
              <div className="flex flex-col sm:flex-row gap-4">
                 <button onClick={() => startPlayback()} className="flex-1 min-w-[140px] bg-white text-black hover:bg-blue-600 hover:text-white py-5 sm:py-6 rounded-[1.5rem] sm:rounded-[2rem] font-black text-xs sm:text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 outline-none">
                   <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"/></svg>
                   Play Now
                 </button>
                 <button onClick={() => toggleWatchlist(selectedMovie)} className={`p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] transition-all border outline-none active:scale-90 flex items-center justify-center gap-3 ${isInWatchlist(selectedMovie.id) ? 'bg-blue-600 text-white border-blue-500 shadow-xl' : 'bg-white/5 text-white border-white/10'}`}>
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" fill={isInWatchlist(selectedMovie.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                    <span className="font-black text-[10px] sm:text-xs uppercase tracking-widest block">{isInWatchlist(selectedMovie.id) ? 'Saved' : 'Add to List'}</span>
                 </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                <div className="md:col-span-2 space-y-6 sm:space-y-8">
                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-blue-500/60 italic">Synopsis</h3>
                    <p className="text-gray-400 leading-relaxed text-sm sm:text-lg font-medium max-w-3xl">{selectedMovie.overview}</p>
                  </div>
                  
                  {selectedMovie.credits?.cast && (
                    <div className="space-y-4">
                      <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-blue-500/60 italic">The Cast</h3>
                      <div className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar pb-4">
                        {selectedMovie.credits.cast.slice(0, 10).map((actor: Cast) => (
                          <div key={actor.id} className="flex-shrink-0 flex flex-col items-center gap-3 w-16 sm:w-24">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-white/5 bg-white/5 group relative">
                              <img src={actor.profile_path ? `${IMAGE_BASE_URL}/w185${actor.profile_path}` : 'https://www.gravatar.com/avatar?d=mp'} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                            </div>
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-tighter text-center leading-tight line-clamp-2">{actor.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6 sm:space-y-10">
                  <div className="bg-white/5 border border-white/10 p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] space-y-4 sm:space-y-6">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest italic">Details</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <span className="block text-[9px] text-gray-600 font-black uppercase tracking-widest mb-1">Genres</span>
                        <div className="flex flex-wrap gap-2">
                          {selectedMovie.genres?.map((g: any) => (
                            <span key={g.id} className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase">{g.name}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="block text-[9px] text-gray-600 font-black uppercase tracking-widest mb-1">Studio</span>
                        <span className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase">{selectedMovie.production_companies?.[0]?.name || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedMovie.seasons && (
                <div className="mt-8 sm:mt-12 space-y-6 sm:space-y-10">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4 sm:pb-6">
                    <h3 className="text-xl sm:text-3xl font-black tracking-tighter uppercase italic">Episodes</h3>
                    <div className="relative">
                      <button onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)} className="flex items-center gap-3 bg-white/5 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border border-white/10 hover:bg-white/10 transition-all active:scale-95">
                        <span className="font-black text-[10px] sm:text-xs uppercase tracking-widest">Season {currentSeason}</span>
                        <svg className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform ${isSeasonDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth={3} /></svg>
                      </button>
                      {isSeasonDropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-32 sm:w-40 bg-[#0a0a0a] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl z-[200] p-2 max-h-60 overflow-y-auto no-scrollbar">
                          {selectedMovie.seasons.filter((s: any) => s.season_number > 0).map((season: any) => (
                            <button key={season.id} onClick={async () => {
                              setCurrentSeason(season.season_number);
                              setIsSeasonDropdownOpen(false);
                              const eps = await tmdbService.fetchSeasons(selectedMovie.id, season.season_number);
                              setSeasonsData(eps || []);
                            }} className={`w-full text-left px-3 py-2 sm:px-4 sm:py-3 rounded-xl font-black uppercase text-[9px] sm:text-[10px] tracking-tight transition-all ${currentSeason === season.season_number ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-white/5'}`}>S{season.season_number}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:gap-4">
                    {seasonsData?.map((ep) => (
                      <button key={ep.id} onClick={() => startPlayback(ep.season_number, ep.episode_number)} className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] bg-white/5 hover:bg-blue-600/10 group transition-all text-left border border-white/5 hover:border-blue-500/30 active:scale-[0.99]">
                        <div className="w-full sm:w-40 md:w-48 aspect-video rounded-xl sm:rounded-3xl overflow-hidden relative flex-shrink-0 bg-black shadow-2xl">
                          <img src={ep.still_path ? `${IMAGE_BASE_URL}/w500${ep.still_path}` : `${IMAGE_BASE_URL}/original${selectedMovie.backdrop_path}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center text-black shadow-xl"><svg className="w-4 h-4 sm:w-5 sm:h-5 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"/></svg></div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 sm:gap-2">
                          <h4 className="font-black text-base sm:text-xl group-hover:text-blue-500 truncate tracking-tight uppercase italic">{ep.episode_number}. {ep.name}</h4>
                          <p className="text-[10px] sm:text-xs text-gray-500 line-clamp-2 font-medium leading-relaxed max-w-2xl">{ep.overview || "Episode details coming soon..."}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isSourceSelectorOpen && selectedMovie && (
        <SourceSelector id={selectedMovie.id} type={selectedMovie.seasons ? 'tv' : 'movie'} season={currentSeason} episode={currentEpisode} onSelect={handleSourceSelect} onClose={() => setIsSourceSelectorOpen(false)} />
      )}

      {isPlayerOpen && activeSource && (
        <Player initialSource={activeSource} allSources={allSources} title={selectedMovie.title || selectedMovie.name} id={selectedMovie.id} type={selectedMovie.seasons ? 'tv' : 'movie'} episodes={selectedMovie.seasons ? seasonsData : undefined} currentEpisode={selectedMovie.seasons ? currentEpisode : undefined} onEpisodeChange={(ep) => setCurrentEpisode(ep)} onClose={() => setIsPlayerOpen(false)} />
      )}
    </Layout>
  );
};

export default App;
