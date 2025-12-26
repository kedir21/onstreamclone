
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
      className="group relative flex-shrink-0 w-32 sm:w-40 md:w-48 aspect-[2/3] rounded-2xl overflow-hidden focus-ring cursor-pointer outline-none bg-[#111] border border-white/5 transition-all duration-300"
    >
      <img
        src={movie.poster_path ? `${IMAGE_BASE_URL}/w500${movie.poster_path}` : 'https://picsum.photos/400/600?grayscale'}
        alt={movie.title || movie.name}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        loading="lazy"
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
        <h3 className="text-xs font-black truncate uppercase tracking-tighter text-white">
          {movie.title || movie.name}
        </h3>
        <span className="text-blue-400 font-black text-[10px]">★ {movie.vote_average.toFixed(1)}</span>
      </div>
    </button>
  );
};

export default MovieCard;
