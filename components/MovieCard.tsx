
import React from 'react';
import { Movie } from '../types';
import { IMAGE_BASE_URL } from '../constants';

interface MovieCardProps {
  movie: Movie;
  onClick: (movie: Movie) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onClick }) => {
  return (
    <button
      onClick={() => onClick(movie)}
      className="group relative flex-shrink-0 w-28 md:w-40 aspect-[2/3] rounded-2xl overflow-hidden focus-ring cursor-pointer outline-none bg-[#1a1a1a] shadow-xl border border-white/5"
    >
      <img
        src={`${IMAGE_BASE_URL}/w500${movie.poster_path}`}
        alt={movie.title || movie.name}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'https://picsum.photos/400/600?grayscale';
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 md:p-3">
        <h3 className="text-[10px] md:text-xs font-black truncate uppercase tracking-tight">{movie.title || movie.name}</h3>
        <p className="text-[8px] md:text-[10px] text-blue-400 font-black">★ {movie.vote_average.toFixed(1)}</p>
      </div>
    </button>
  );
};

export default MovieCard;
