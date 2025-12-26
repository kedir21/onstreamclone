export const TMDB_API_KEY = '4f10ec4dbb0a90737737dc9ffd5506c3';
export const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export const VIDEO_PROVIDERS = [
  {
    id: 'vidsrccc',
    name: 'VidSrc.CC',
    movie: (id: number) => `https://vidsrc.cc/v2/embed/movie/${id}`,
    tv: (id: number, s: number, e: number) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`,
  },
  {
    id: 'rive',
    name: 'Rive',
    movie: (id: number) => `https://rivestream.org/embed?type=movie&id=${id}`,
    tv: (id: number, s: number, e: number) => `https://rivestream.org/embed?type=tv&id=${id}&season=${s}&episode=${e}`,
  }
];