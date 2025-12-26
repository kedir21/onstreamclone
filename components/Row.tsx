
import React from 'react';
import { Movie } from '../types';
import MovieCard from './MovieCard';

interface RowProps {
  title: string;
  items: Movie[];
  onItemClick: (movie: Movie) => void;
}

const Row: React.FC<RowProps> = ({ title, items, onItemClick }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="py-4 px-6 md:px-10">
      <h2 className="text-base md:text-xl font-black mb-4 tracking-tighter flex items-center gap-2 uppercase italic text-white/90">
        <span className="w-1 h-4 md:h-5 bg-blue-600 rounded-full"></span>
        {title}
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-4 scroll-smooth no-scrollbar">
        {items.map(item => (
          <MovieCard key={item.id} movie={item} onClick={onItemClick} />
        ))}
      </div>
    </div>
  );
};

export default Row;
