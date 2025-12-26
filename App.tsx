
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Layout from './components/Layout';
import Row from './components/Row';
import Player from './components/Player';
import SourceSelector from './components/SourceSelector';
import { tmdbService } from './services/tmdbService';
import { extractorService } from './services/extractorService';
import { Movie, Episode, VideoSource, Genre } from './types';
import { IMAGE_BASE_URL } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [trending, setTrending] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [popularTV, setPopularTV] = useState<Movie[]>([]);
  
  // Watchlist state
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searchSort, setSearchSort] = useState<'relevance' | 'rating' | 'date'>('relevance');
  const [searchFilter, setSearchFilter] = useState<'all' | 'movie' | 'tv'>('all');

  // Genre state
  const [movieGenres, setMovieGenres] = useState<Genre[]>([]);
  const [tvGenres, setTvGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [isGenreMenuOpen, setIsGenreMenuOpen] = useState(false);
  
  const [pages, setPages] = useState({ movies: 1, tv: 1, search: 1, trending: 1 });
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

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
  const genreMenuRef = useRef<HTMLDivElement>(null);

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

  // Load Watchlist
  useEffect(() => {
    const saved = localStorage.getItem('onstream_watchlist');
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved));
      } catch (e) {
        console.error("Watchlist parse error", e);
      }
    }
  }, []);

  const toggleWatchlist = (movie: Movie) => {
    const isStored = watchlist.find(m => m.id === movie.id);
    let updated;
    if (isStored) {
      updated = watchlist.filter(m => m.id !== movie.id);
    } else {
      // Ensure it has a media_type for future consistency
      const movieWithMeta = { ...movie, media_type: movie.media_type || (movie.name ? 'tv' : 'movie') };
      updated = [movieWithMeta, ...watchlist];
    }
    setWatchlist(updated);
    localStorage.setItem('onstream_watchlist', JSON.stringify(updated));
  };

  const isInWatchlist = (id: number) => {
    return !!watchlist.find(m => m.id === id);
  };

  // Click outside listener for genre menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (genreMenuRef.current && !genreMenuRef.current.contains(event.target as Node)) {
        setIsGenreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initial Data Load
  useEffect(() => {
    const loadStaticData = async () => {
      try {
        const [t, mg, tg] = await Promise.all([
          tmdbService.fetchTrending(1),
          tmdbService.fetchGenres('movie'),
          tmdbService.fetchGenres('tv')
        ]);
        setTrending(t);
        setMovieGenres(mg);
        setTvGenres(tg);
      } catch (err) {
        console.error("Static data fetch error", err);
      }
    };
    loadStaticData();
  }, []);

  // Synchronized Data Fetcher
  useEffect(() => {
    const refreshData = async () => {
      if (activeTab === 'watchlist' || activeTab === 'search') return;
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
          const [m, t] = await Promise.all([
            tmdbService.fetchPopularMovies(1),
            tmdbService.fetchPopularTV(1)
          ]);
          setPopularMovies(m);
          setPopularTV(t);
        }
      } catch (err) {
        console.error("Refresh error", err);
      } finally {
        setLoadingMore(false);
      }
    };

    refreshData();
  }, [activeTab, selectedGenre]);

  const loadMore = async () => {
    if (loadingMore || activeTab === 'watchlist') return;
    setLoadingMore(true);
    try {
      if (activeTab === 'movies') {
        const nextPage = pages.movies + 1;
        const data = await tmdbService.fetchPopularMovies(nextPage, selectedGenre || undefined);
        if (data.length > 0) {
          setPopularMovies(prev => [...prev, ...data]);
          setPages(prev => ({ ...prev, movies: nextPage }));
        } else {
          setHasMore(false);
        }
      } else if (activeTab === 'tv') {
        const nextPage = pages.tv + 1;
        const data = await tmdbService.fetchPopularTV(nextPage, selectedGenre || undefined);
        if (data.length > 0) {
          setPopularTV(prev => [...prev, ...data]);
          setPages(prev => ({ ...prev, tv: nextPage }));
        } else {
          setHasMore(false);
        }
      } else if (activeTab === 'search' && searchQuery) {
        const nextPage = pages.search + 1;
        const data = await tmdbService.search(searchQuery, nextPage);
        const filtered = data.filter(r => r.media_type === 'movie' || r.media_type === 'tv');
        if (filtered.length > 0) {
          setSearchResults(prev => [...prev, ...filtered]);
          setPages(prev => ({ ...prev, search: nextPage }));
        } else {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error("Load more error", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const openDetails = async (movie: Movie) => {
    try {
      const details = await tmdbService.fetchDetails(movie.id, movie.media_type || (movie.name ? 'tv' : 'movie'));
      setSelectedMovie(details);
      setIsDetailOpen(true);
      setIsSeasonDropdownOpen(false);
      if (detailScrollRef.current) detailScrollRef.current.scrollTop = 0;
      
      if (details.seasons || movie.media_type === 'tv' || (!movie.media_type && movie.name)) {
        const episodes = await tmdbService.fetchSeasons(movie.id, 1);
        setSeasonsData(episodes || []);
        setCurrentSeason(1);
        setCurrentEpisode(1);
      }
    } catch (e) {
      console.error("Details fetch error", e);
    }
  };

  const changeSeason = async (seasonNum: number) => {
    setCurrentSeason(seasonNum);
    setIsSeasonDropdownOpen(false);
    const episodes = await tmdbService.fetchSeasons(selectedMovie.id, seasonNum);
    setSeasonsData(episodes || []);
  };

  const startPlayback = (season?: number, episode?: number) => {
    if (season !== undefined) setCurrentSeason(season);
    if (episode !== undefined) setCurrentEpisode(episode);
    
    const sources = extractorService.getSources(
      selectedMovie.id, 
      selectedMovie.seasons ? 'tv' : 'movie', 
      season || currentSeason, 
      episode || currentEpisode
    );
    
    setAllSources(sources);
    setActiveSource(sources[0]);
    setIsPlayerOpen(true);
  };

  const handleSourceSelect = (source: VideoSource) => {
    setIsSourceSelectorOpen(false);
    setActiveSource(source);
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
    } catch (err) {
      console.error("Search error", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const generateMatchScore = (id: number) => {
    const score = (id % 15) + 85;
    return score > 99 ? 99 : score;
  };

  const processedSearchResults = useMemo(() => {
    let results = [...searchResults];
    if (searchFilter !== 'all') {
      results = results.filter(r => r.media_type === searchFilter);
    }
    if (searchSort === 'rating') {
      results.sort((a, b) => b.vote_average - a.vote_average);
    } else if (searchSort === 'date') {
      results.sort((a, b) => {
        const dateA = a.release_date || a.first_air_date || '';
        const dateB = b.release_date || b.first_air_date || '';
        return dateB.localeCompare(dateA);
      });
    }
    return results;
  }, [searchResults, searchFilter, searchSort]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setHasMore(tab !== 'watchlist');
    setSelectedGenre(null);
    setIsGenreMenuOpen(false);
  };

  const currentGenreName = useMemo(() => {
    if (!selectedGenre) return 'All Genres';
    const genres = activeTab === 'movies' ? movieGenres : tvGenres;
    return genres.find(g => g.id === selectedGenre)?.name || 'All Genres';
  }, [selectedGenre, activeTab, movieGenres, tvGenres]);

  return (
    <Layout activeTab={activeTab} setActiveTab={handleTabChange}>
      <div className="pb-10">
        {activeTab === 'home' && (
          <>
            {trending[0] && (
              <div className="relative w-full h-[55vh] group overflow-hidden">
                <img src={`${IMAGE_BASE_URL}/original${trending[0].backdrop_path}`} className="w-full h-full object-cover" alt="Banner" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex flex-col justify-end px-6 pb-12 gap-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">Trending</span>
                    <span className="text-gray-400 font-bold text-sm">★ {trending[0].vote_average.toFixed(1)}</span>
                  </div>
                  <h1 className="text-3xl font-black max-w-full leading-tight tracking-tighter italic uppercase">{trending[0].title || trending[0].name}</h1>
                  <div className="flex gap-3">
                    <button onClick={() => openDetails(trending[0])} className="flex-1 flex items-center justify-center gap-2 bg-white text-black hover:bg-blue-600 hover:text-white px-4 py-3 rounded-xl font-black text-sm transition-all outline-none">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"/></svg>
                      Watch
                    </button>
                    <button onClick={() => openDetails(trending[0])} className="p-3 bg-white/10 backdrop-blur-xl rounded-xl border border-white/10 text-white">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
            <Row title="Popular Movies" items={popularMovies} onItemClick={openDetails} />
            <Row title="Trending TV Shows" items={popularTV} onItemClick={openDetails} />
            <Row title="Continue Watching" items={watchlist.slice(0, 8)} onItemClick={openDetails} />
          </>
        )}

        {(activeTab === 'movies' || activeTab === 'tv') && (
           <div className="p-6">
             <div className="flex items-center justify-between gap-4 mb-8">
               <h1 className="text-3xl font-black capitalize tracking-tighter italic">{activeTab}</h1>
               
               <div className="relative" ref={genreMenuRef}>
                 <button 
                   onClick={() => setIsGenreMenuOpen(!isGenreMenuOpen)}
                   className="flex items-center gap-4 bg-white/5 border border-white/10 px-5 py-2.5 rounded-2xl transition-all focus-ring outline-none"
                 >
                   <span className="font-black text-[10px] uppercase tracking-widest">{currentGenreName}</span>
                   <svg className={`w-4 h-4 transition-transform ${isGenreMenuOpen ? 'rotate-180 text-blue-500' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                   </svg>
                 </button>

                 {isGenreMenuOpen && (
                   <div className="absolute right-0 top-full mt-2 w-56 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl z-[200] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 backdrop-blur-3xl">
                     <div className="max-h-80 overflow-y-auto no-scrollbar p-1.5 space-y-0.5">
                       <button 
                         onClick={() => { setSelectedGenre(null); setIsGenreMenuOpen(false); }}
                         className={`w-full text-left px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-between ${selectedGenre === null ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                       >
                         <span>All Genres</span>
                       </button>
                       {(activeTab === 'movies' ? movieGenres : tvGenres).map(genre => (
                         <button 
                           key={genre.id}
                           onClick={() => { setSelectedGenre(genre.id); setIsGenreMenuOpen(false); }}
                           className={`w-full text-left px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-between ${selectedGenre === genre.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                         >
                           <span>{genre.name}</span>
                         </button>
                       ))}
                     </div>
                   </div>
                 )}
               </div>
             </div>

             <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
               {(activeTab === 'movies' ? popularMovies : popularTV).map((movie, idx) => {
                 const currentList = activeTab === 'movies' ? popularMovies : popularTV;
                 const isLast = currentList.length === idx + 1;
                 return (
                   <button 
                    key={`${movie.id}-${idx}`} 
                    ref={isLast ? lastElementRef : null}
                    onClick={() => openDetails(movie)} 
                    className="flex flex-col gap-2 group outline-none text-left"
                   >
                     <div className="rounded-2xl overflow-hidden aspect-[2/3] shadow-2xl transition-all border border-white/5 bg-[#111]">
                       <img src={movie.poster_path ? `${IMAGE_BASE_URL}/w500${movie.poster_path}` : 'https://picsum.photos/400/600'} className="w-full h-full object-cover" loading="lazy" />
                     </div>
                     <span className="text-[11px] font-black truncate group-hover:text-blue-400 uppercase tracking-tight px-1">{movie.title || movie.name}</span>
                   </button>
                 );
               })}
             </div>
             {loadingMore && (
               <div className="py-12 flex justify-center">
                 <div className="w-8 h-8 border-4 border-white/5 border-t-blue-500 rounded-full animate-spin"></div>
               </div>
             )}
           </div>
        )}

        {activeTab === 'watchlist' && (
          <div className="p-6">
             <div className="mb-8">
               <h1 className="text-3xl font-black tracking-tighter italic uppercase">Watchlist</h1>
               <p className="text-gray-500 text-xs font-bold mt-1 uppercase tracking-widest">{watchlist.length} items saved</p>
             </div>
             {watchlist.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-24 text-center">
                 <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                   <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" strokeWidth={2} /></svg>
                 </div>
                 <h2 className="text-xl font-black text-gray-400 uppercase italic">Your list is empty</h2>
                 <p className="text-gray-600 text-sm mt-2 font-medium max-w-[200px]">Save your favorite movies and shows to watch them later.</p>
                 <button onClick={() => setActiveTab('home')} className="mt-8 bg-blue-600 px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-600/20">Explore Home</button>
               </div>
             ) : (
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                 {watchlist.map((movie) => (
                   <button key={movie.id} onClick={() => openDetails(movie)} className="flex flex-col gap-2 group outline-none text-left animate-in zoom-in-95 duration-300">
                     <div className="rounded-2xl overflow-hidden aspect-[2/3] shadow-2xl border border-white/5 bg-[#111]">
                       <img src={movie.poster_path ? `${IMAGE_BASE_URL}/w500${movie.poster_path}` : 'https://picsum.photos/400/600'} className="w-full h-full object-cover" />
                     </div>
                     <span className="text-[11px] font-black truncate uppercase tracking-tight px-1">{movie.title || movie.name}</span>
                   </button>
                 ))}
               </div>
             )}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="p-6">
            <h1 className="text-3xl font-black tracking-tighter italic uppercase mb-6">Search</h1>
            <form onSubmit={handleSearch} className="mb-8">
              <div className="relative group">
                <input type="text" placeholder="Movies, Shows..." autoFocus className="w-full bg-[#0a0a0a] border border-white/10 focus:border-blue-600 focus:bg-[#0f0f0f] rounded-2xl py-4 px-6 text-lg outline-none transition-all placeholder:text-gray-800 font-black shadow-2xl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-blue-600 rounded-xl text-white shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </button>
              </div>
            </form>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              {processedSearchResults.map((movie, idx) => (
                <button key={`${movie.id}-${idx}`} onClick={() => openDetails(movie)} className="flex flex-col gap-2 group outline-none text-left">
                  <div className="rounded-2xl overflow-hidden aspect-[2/3] shadow-2xl border border-white/5 bg-[#111]">
                    <img src={movie.poster_path ? `${IMAGE_BASE_URL}/w500${movie.poster_path}` : 'https://picsum.photos/400/600'} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <span className="text-[11px] font-black truncate uppercase tracking-tight px-1">{movie.title || movie.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {isDetailOpen && selectedMovie && (
        <div ref={detailScrollRef} className="fixed inset-0 z-[100] overflow-y-auto bg-black animate-in fade-in slide-in-from-bottom-10 duration-500 no-scrollbar">
          <div className="w-full min-h-screen pb-24 bg-[#050505] relative">
            <div className="absolute top-4 left-4 z-[110]">
              <button onClick={() => setIsDetailOpen(false)} className="p-3 bg-black/60 hover:bg-white text-white hover:text-black rounded-xl transition-all shadow-2xl backdrop-blur-3xl border border-white/10 outline-none">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
              </button>
            </div>

            <div className="absolute top-0 w-full h-[50vh] overflow-hidden">
              <img src={`${IMAGE_BASE_URL}/original${selectedMovie.backdrop_path}`} className="w-full h-full object-cover opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent" />
            </div>

            <div className="relative p-6 pt-32 flex flex-col gap-6">
              <div className="flex gap-4 items-end">
                <div className="w-32 flex-shrink-0 shadow-2xl rounded-2xl overflow-hidden border border-white/10">
                  <img src={`${IMAGE_BASE_URL}/w500${selectedMovie.poster_path}`} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 space-y-2">
                   <h1 className="text-3xl font-black leading-tight tracking-tighter uppercase italic line-clamp-2">{selectedMovie.title || selectedMovie.name}</h1>
                   <div className="flex flex-wrap items-center gap-2">
                     <span className="text-green-500 font-black text-sm">{generateMatchScore(selectedMovie.id)}% Match</span>
                     <span className="text-gray-400 text-sm font-bold">{selectedMovie.release_date?.split('-')[0] || selectedMovie.first_air_date?.split('-')[0]}</span>
                   </div>
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                 <button onClick={() => startPlayback()} className="flex-1 bg-blue-600 hover:bg-white hover:text-black py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20 outline-none uppercase tracking-widest">
                   <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"/></svg>
                   Play Now
                 </button>
                 <button onClick={() => toggleWatchlist(selectedMovie)} className={`p-4 rounded-2xl transition-all border outline-none ${isInWatchlist(selectedMovie.id) ? 'bg-white text-black border-white' : 'bg-white/5 text-white border-white/10'}`}>
                    <svg className="w-6 h-6" fill={isInWatchlist(selectedMovie.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                 </button>
                 <button onClick={() => setIsSourceSelectorOpen(true)} className="p-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                 </button>
              </div>

              <p className="text-gray-400 leading-relaxed text-sm font-medium line-clamp-4">{selectedMovie.overview}</p>
              
              <div className="flex flex-wrap gap-2">
                {selectedMovie.genres?.map((g: any) => (
                  <span key={g.id} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-gray-400">{g.name}</span>
                ))}
              </div>

              {selectedMovie.seasons && (
                <div className="mt-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black tracking-tighter uppercase italic">Episodes</h3>
                    <button onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)} className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                      <span className="font-black text-[10px] uppercase">Season {currentSeason}</span>
                      <svg className={`w-3 h-3 transition-transform ${isSeasonDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth={3} /></svg>
                    </button>
                  </div>
                  
                  {isSeasonDropdownOpen && (
                    <div className="bg-white/5 rounded-2xl p-2 grid grid-cols-3 gap-2 border border-white/5">
                      {selectedMovie.seasons.filter((s: any) => s.season_number > 0).map((season: any) => (
                        <button key={season.id} onClick={() => changeSeason(season.season_number)} className={`px-2 py-3 rounded-xl font-black uppercase text-[9px] tracking-tight transition-all ${currentSeason === season.season_number ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-white/5'}`}>S{season.season_number}</button>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col gap-4">
                    {seasonsData?.map((ep) => (
                      <button key={ep.id} onClick={() => startPlayback(ep.season_number, ep.episode_number)} className="flex gap-4 p-3 rounded-2xl bg-white/5 group transition-all text-left border border-white/5">
                        <div className="w-24 aspect-video rounded-lg overflow-hidden relative flex-shrink-0">
                          <img src={ep.still_path ? `${IMAGE_BASE_URL}/w500${ep.still_path}` : `${IMAGE_BASE_URL}/original${selectedMovie.backdrop_path}`} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h4 className="font-black text-xs group-hover:text-blue-400 truncate tracking-tight">{ep.episode_number}. {ep.name}</h4>
                          <p className="text-[10px] text-gray-500 line-clamp-1 mt-1 font-medium">{ep.overview || "No description."}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-8">
                 <h3 className="text-xl font-black tracking-tighter uppercase italic mb-6">Similar</h3>
                 <div className="grid grid-cols-3 gap-4">
                   {selectedMovie.recommendations?.results?.slice(0, 9).map((rec: Movie) => (
                     <button key={rec.id} onClick={() => openDetails(rec)} className="rounded-xl outline-none overflow-hidden aspect-[2/3] border border-white/5 bg-[#111]">
                       <img src={rec.poster_path ? `${IMAGE_BASE_URL}/w500${rec.poster_path}` : 'https://picsum.photos/400/600'} className="w-full h-full object-cover" />
                     </button>
                   ))}
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSourceSelectorOpen && selectedMovie && (
        <SourceSelector 
          id={selectedMovie.id} 
          type={selectedMovie.seasons ? 'tv' : 'movie'} 
          season={currentSeason} 
          episode={currentEpisode} 
          onSelect={handleSourceSelect} 
          onClose={() => setIsSourceSelectorOpen(false)} 
        />
      )}

      {isPlayerOpen && activeSource && (
        <Player 
          initialSource={activeSource} 
          allSources={allSources}
          title={selectedMovie.title || selectedMovie.name} 
          id={selectedMovie.id}
          type={selectedMovie.seasons ? 'tv' : 'movie'}
          episodes={selectedMovie.seasons ? seasonsData : undefined} 
          currentEpisode={selectedMovie.seasons ? currentEpisode : undefined} 
          onEpisodeChange={(ep) => setCurrentEpisode(ep)} 
          onClose={() => setIsPlayerOpen(false)} 
        />
      )}
    </Layout>
  );
};

export default App;
