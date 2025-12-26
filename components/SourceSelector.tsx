
import React from 'react';
import { extractorService } from '../services/extractorService';
import { VideoSource } from '../types';

interface SourceSelectorProps {
  onSelect: (source: VideoSource) => void;
  onClose: () => void;
  id: number;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
}

const SourceSelector: React.FC<SourceSelectorProps> = ({ onSelect, onClose, id, type, season, episode }) => {
  const sources = extractorService.getSources(id, type, season, episode);

  return (
    <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-10 md:p-14 max-w-2xl w-full shadow-2xl">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-5xl font-black tracking-tighter uppercase italic">Choose Mirror</h2>
          </div>
          <button onClick={onClose} className="p-4 hover:bg-white/5 rounded-full transition-all text-gray-500 hover:text-white">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {sources.map((source, index) => (
            <button
              key={index}
              onClick={() => onSelect(source)}
              className="w-full flex items-center justify-between p-6 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/50 rounded-[2rem] transition-all group focus-ring outline-none"
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-3xl shadow-lg shadow-blue-600/20">
                  {source.provider[0]}
                </div>
                <div className="text-left">
                  <span className="font-black text-2xl block tracking-tight">{source.provider}</span>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="bg-white/10 text-gray-400 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest">Mirror #{index + 1}</span>
                    <span className="text-green-500 text-[9px] font-black uppercase tracking-widest">Available</span>
                  </div>
                </div>
              </div>
              <svg className="w-8 h-8 text-gray-700 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SourceSelector;
