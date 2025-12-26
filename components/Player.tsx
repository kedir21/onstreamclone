
import React, { useState, useEffect, useRef } from 'react';
import { Episode, VideoSource } from '../types';
import { extractorService } from '../services/extractorService';

declare const Hls: any;

interface PlayerProps {
  initialSource: VideoSource;
  allSources?: VideoSource[];
  title: string;
  onClose: () => void;
  id: number;
  type: 'movie' | 'tv';
  episodes?: Episode[];
  currentEpisode?: number;
  onEpisodeChange?: (ep: number) => void;
}

const Player: React.FC<PlayerProps> = ({ 
  initialSource,
  allSources = [],
  title, 
  onClose, 
  id, 
  type, 
  episodes, 
  currentEpisode, 
  onEpisodeChange 
}) => {
  const [activeSource, setActiveSource] = useState<VideoSource | null>(null);
  const [isResolving, setIsResolving] = useState(true);
  const [showHud, setShowHud] = useState(true);
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);
  
  // Playback State
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hudTimer = useRef<number | null>(null);

  const resetHudTimer = () => {
    setShowHud(true);
    if (hudTimer.current) window.clearTimeout(hudTimer.current);
    hudTimer.current = window.setTimeout(() => {
      setShowHud(false);
      setIsSourceDropdownOpen(false);
    }, 5000);
  };

  const handleUserInteraction = () => {
    resetHudTimer();
  };

  const initNativePlayer = (url: string) => {
    if (!videoRef.current) return;
    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferSize: 60 * 1024 * 1024, // 60MB
        maxBufferLength: 30,
        enableWorker: true,
        lowLatencyMode: true,
      });
      hls.loadSource(url);
      hls.attachMedia(videoRef.current);
      hls.on(Hls.Events.MANIFEST_PARSED, () => videoRef.current?.play());
    } else {
      videoRef.current.src = url;
    }
  };

  const prepareStream = async (source: VideoSource) => {
    setIsResolving(true);
    const resolved = await extractorService.resolveToNative(source);
    setActiveSource(resolved);
    setIsResolving(false);
    if (resolved.type === 'm3u8' || resolved.type === 'mp4') {
      setTimeout(() => initNativePlayer(resolved.url), 100);
    }
    resetHudTimer();
  };

  useEffect(() => {
    const autoFullscreen = async () => {
      try {
        if (containerRef.current && !document.fullscreenElement) {
          await containerRef.current.requestFullscreen();
        }
      } catch (err) {
        console.warn("Auto-fullscreen blocked.");
      }
    };
    
    autoFullscreen();
    prepareStream(initialSource);

    const handleKey = (e: KeyboardEvent) => {
      resetHudTimer();
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      if (e.code === 'ArrowRight') skip(10);
      if (e.code === 'ArrowLeft') skip(-10);
      if (e.code === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [initialSource]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) videoRef.current.currentTime += seconds;
  };

  const changeVolume = (delta: number) => {
    const newVol = Math.max(0, Math.min(1, volume + delta));
    setVolume(newVol);
    if (videoRef.current) videoRef.current.volume = newVol;
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) videoRef.current.muted = !isMuted;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const isNative = activeSource?.type === 'm3u8' || activeSource?.type === 'mp4';

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center overflow-hidden"
      onMouseMove={handleUserInteraction}
      onClick={handleUserInteraction}
    >
      {/* Media Layer */}
      <div className="w-full h-full relative z-[10]">
        {!isResolving && activeSource && (
          isNative ? (
            <video 
              ref={videoRef}
              className="w-full h-full"
              onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
              onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              autoPlay
              controls={false}
            />
          ) : (
            <iframe 
              src={activeSource.url} 
              className="w-full h-full border-0" 
              sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; gyroscope"
              allowFullScreen
              referrerPolicy="origin"
            />
          )
        )}
      </div>

      {/* Loading State Overlay */}
      {isResolving && (
        <div className="absolute inset-0 z-[1100] bg-black flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-white/5 border-t-blue-500 rounded-full animate-spin mb-6" />
          <p className="text-white font-black uppercase tracking-[0.4em] text-xs animate-pulse">Connecting to Mirror...</p>
        </div>
      )}

      {/* Minimalist Controls Overlay */}
      <div className={`absolute inset-0 z-[50] flex flex-col justify-between p-6 md:p-10 transition-all duration-700 pointer-events-none ${showHud ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Top Header */}
        <div className="flex justify-between items-start pointer-events-none">
          <div className="flex gap-6 items-center pointer-events-auto">
            <button onClick={onClose} className="p-4 bg-black/60 hover:bg-white text-white hover:text-black rounded-[1.5rem] transition-all border border-white/10 outline-none focus:ring">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-[2rem] border border-white/10">
              <h2 className="text-2xl font-black text-white leading-tight tracking-tight">{title}</h2>
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{activeSource?.provider} • Streaming Online</p>
              </div>
            </div>
          </div>

          <div className="relative pointer-events-auto flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 px-4 py-2 rounded-full backdrop-blur-md">
              <span className="w-1 h-1 bg-blue-500 rounded-full animate-ping" />
              <span className="text-[9px] font-black uppercase text-blue-300">Fast CDN Active</span>
            </div>

            <button 
              onClick={() => setIsSourceDropdownOpen(!isSourceDropdownOpen)}
              className="flex items-center gap-4 bg-black/60 backdrop-blur-3xl border border-white/10 px-6 py-4 rounded-[1.5rem] text-white hover:bg-white/10 transition-all outline-none focus:ring"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16m-7 6h7" /></svg>
              <span className="font-black text-xs uppercase tracking-widest">Mirror</span>
            </button>

            {isSourceDropdownOpen && (
              <div className="absolute right-0 top-full mt-4 w-56 bg-black border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 z-[100]">
                {allSources.map((source, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      prepareStream(source);
                      setIsSourceDropdownOpen(false);
                    }}
                    className={`w-full text-left px-6 py-4 font-black text-[10px] uppercase tracking-widest transition-colors hover:bg-blue-600/20 flex items-center justify-between ${activeSource?.provider === source.provider ? 'text-blue-500' : 'text-gray-400'}`}
                  >
                    <span>{source.provider}</span>
                    {activeSource?.provider === source.provider && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="space-y-6 pointer-events-none">
          {isNative && (
            <div className="space-y-2 pointer-events-auto bg-black/40 backdrop-blur-md p-5 rounded-[2.5rem] border border-white/10">
              <div className="h-2 w-full bg-white/10 rounded-full relative group cursor-pointer overflow-hidden"
                onClick={(e) => {
                  if (!videoRef.current || !duration) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = (e.clientX - rect.left) / rect.width;
                  videoRef.current.currentTime = pos * duration;
                }}
              >
                <div className="h-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.8)]" style={{ width: `${(currentTime / duration) * 100}%` }} />
              </div>
              <div className="flex justify-between text-[11px] font-black font-mono text-gray-400 px-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 pointer-events-auto">
              {isNative && (
                <div className="flex items-center gap-4 bg-black/60 backdrop-blur-3xl p-2 rounded-[2.5rem] border border-white/10 shadow-2xl">
                  <button onClick={() => skip(-10)} className="p-4 text-white/50 hover:text-white transition-colors outline-none">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M8.445 14.832A1 1 0 0010 14V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4zM16.445 14.832A1 1 0 0018 14V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z"/></svg>
                  </button>
                  <button onClick={togglePlay} className="text-white hover:text-blue-500 transition-transform active:scale-90 outline-none">
                    {isPlaying ? <svg className="w-14 h-14" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    : <svg className="w-14 h-14" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>}
                  </button>
                  <button onClick={() => skip(10)} className="p-4 text-white/50 hover:text-white transition-colors outline-none">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M4.555 6.168A1 1 0 003 7v8a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4zM12.555 6.168A1 1 0 0011 7v8a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4z"/></svg>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-6 pointer-events-auto">
              <div className="flex gap-4">
                {episodes && currentEpisode && currentEpisode < episodes.length && (
                  <button onClick={() => onEpisodeChange?.(currentEpisode + 1)} className="bg-white text-black px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all outline-none focus:ring shadow-2xl">Next Episode</button>
                )}
                <button onClick={toggleFullscreen} className="p-5 bg-black/60 backdrop-blur-3xl text-white/40 hover:text-white rounded-[1.5rem] border border-white/10 transition-colors outline-none shadow-2xl">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Player;
