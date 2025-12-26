
export interface Movie {
  id: number;
  title: string;
  name?: string; // TV Shows use name
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  media_type: 'movie' | 'tv';
}

export interface Season {
  id: number;
  season_number: number;
  episode_count: number;
  name: string;
  poster_path: string;
}

export interface Episode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  still_path: string;
}

export interface Cast {
  id: number;
  name: string;
  character: string;
  profile_path: string;
}

export interface VideoSource {
  provider: string;
  url: string;
  quality?: string;
  type: 'm3u8' | 'mp4' | 'dash' | 'iframe';
  isDirect?: boolean;
}

export interface Genre {
  id: number;
  name: string;
}
