
import { TMDB_API_KEY, TMDB_BASE_URL } from '../constants';
import { Movie, Season, Episode, Cast, Genre } from '../types';

export const tmdbService = {
  async fetchTrending(page: number = 1): Promise<Movie[]> {
    const res = await fetch(`${TMDB_BASE_URL}/trending/all/day?api_key=${TMDB_API_KEY}&page=${page}`);
    const data = await res.json();
    return data.results;
  },

  async fetchPopularMovies(page: number = 1, genreId?: number): Promise<Movie[]> {
    const url = genreId 
      ? `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&page=${page}&with_genres=${genreId}&sort_by=popularity.desc`
      : `${TMDB_BASE_URL}/movie/popular?api_key=${TMDB_API_KEY}&page=${page}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.results.map((m: any) => ({ ...m, media_type: 'movie' }));
  },

  async fetchPopularTV(page: number = 1, genreId?: number): Promise<Movie[]> {
    const url = genreId 
      ? `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&page=${page}&with_genres=${genreId}&sort_by=popularity.desc`
      : `${TMDB_BASE_URL}/tv/popular?api_key=${TMDB_API_KEY}&page=${page}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.results.map((m: any) => ({ ...m, media_type: 'tv' }));
  },

  async fetchGenres(type: 'movie' | 'tv'): Promise<Genre[]> {
    const res = await fetch(`${TMDB_BASE_URL}/genre/${type}/list?api_key=${TMDB_API_KEY}`);
    const data = await res.json();
    return data.genres;
  },

  async fetchDetails(id: number, type: 'movie' | 'tv'): Promise<any> {
    const res = await fetch(`${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&append_to_response=credits,recommendations`);
    return await res.json();
  },

  async fetchSeasons(tvId: number, seasonNumber: number): Promise<Episode[]> {
    const res = await fetch(`${TMDB_BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`);
    const data = await res.json();
    return data.episodes;
  },

  async search(query: string, page: number = 1): Promise<Movie[]> {
    const res = await fetch(`${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}`);
    const data = await res.json();
    return data.results;
  }
};
