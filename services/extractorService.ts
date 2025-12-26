
import { VIDEO_PROVIDERS } from '../constants';
import { VideoSource } from '../types';

export const extractorService = {
  getSources(id: number, type: 'movie' | 'tv', season?: number, episode?: number): VideoSource[] {
    return VIDEO_PROVIDERS.map(p => ({
      provider: p.name,
      url: type === 'movie' ? p.movie(id) : p.tv(id, season || 1, episode || 1),
      type: 'iframe' as const,
      quality: 'HD'
    }));
  },

  /**
   * DEEP SNIFFER
   * For the "Minimalist" request, we ensure the native takeover is smooth.
   */
  async resolveToNative(source: VideoSource): Promise<VideoSource> {
    try {
      // Direct pass-through for reliable iframe providers.
      // Future: Implement .m3u8 extraction for high-performance native playback.
      return source;
    } catch (e) {
      return source;
    }
  }
};
