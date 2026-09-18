import React, { useState } from 'react';
import { Video, Play, ExternalLink } from 'lucide-react';
import { UserProfile } from '../../types';

interface RecommendedVideosTabProps {
  userProfile?: UserProfile;
}

const FEATURED_VIDEO = {
  id: 'FetEULnMgIs',
  title: 'Python in Tamil for Beginner – Chapter 1 Introduction to Python',
  channelName: 'Hello World Campus',
  youtubeUrl: 'https://youtu.be/FetEULnMgIs?si=Nztya6NFsGL8r7Ji',
  thumbnailUrl: 'https://img.youtube.com/vi/FetEULnMgIs/maxresdefault.jpg',
  fallbackThumbnailUrl: 'https://img.youtube.com/vi/FetEULnMgIs/hqdefault.jpg',
  description: 'Complete beginner-friendly Python programming tutorial in Tamil. Covers core concepts, hands-on coding foundation, and 500+ programming questions approach.',
};

export const RecommendedVideosTab: React.FC<RecommendedVideosTabProps> = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  return (
    <div className="space-y-6 animate-fadeIn text-slate-100 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#06111F] via-[#06111F] to-[#06111F] p-5 sm:p-7 border border-[#BFA373]/40 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold font-cinzel text-white tracking-wide flex items-center gap-2.5">
            <Video className="w-6 h-6 sm:w-7 sm:h-7 text-[#D1B079]" />
            <span>Recommended Video</span>
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm">
            Watch the recommended learning video directly inside the app.
          </p>
        </div>

        <a
          href={FEATURED_VIDEO.youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#06111F] hover:bg-[#06111F] text-slate-300 hover:text-white border border-[#BFA373]/30 hover:border-[#D1B079]/40 text-xs font-semibold transition-all cursor-pointer self-start sm:self-auto"
        >
          <span>Open on YouTube</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Main Single Video Player Card */}
      <div className="rounded-2xl sm:rounded-3xl bg-[#06111F] border border-[#BFA373]/30 shadow-2xl overflow-hidden">
        {/* Top Info Bar */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#06111F]/80 border-b border-[#BFA373]/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-xs font-bold text-slate-200 font-cinzel truncate">
              {FEATURED_VIDEO.channelName}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="text-xs font-bold text-[#D1B079] hover:text-[#D1B079] flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-[#D1B079]" />
            <span>{isPlaying ? 'Reload Player' : 'Play Video'}</span>
          </button>
        </div>

        {/* Video Screen / iFrame */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
          {isPlaying ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${FEATURED_VIDEO.id}?autoplay=1&rel=0`}
              title={FEATURED_VIDEO.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0"
            />
          ) : (
            <div
              onClick={() => setIsPlaying(true)}
              className="relative w-full h-full cursor-pointer group flex items-center justify-center select-none"
            >
              <img
                src={FEATURED_VIDEO.thumbnailUrl}
                alt={FEATURED_VIDEO.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FEATURED_VIDEO.fallbackThumbnailUrl;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/60 group-hover:via-black/20 transition-all" />

              {/* YouTube Header Overlay */}
              <div className="absolute top-0 left-0 right-0 p-3 sm:p-5 flex items-center gap-3 z-10">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white text-slate-900 flex items-center justify-center font-bold text-xs sm:text-sm border border-white/40 shadow-lg shrink-0 overflow-hidden">
                  <span className="font-mono text-[10px] text-center font-black">HW!</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-white text-xs sm:text-base md:text-lg font-bold drop-shadow-md truncate">
                    {FEATURED_VIDEO.title}
                  </h3>
                  <p className="text-slate-200 text-[11px] sm:text-xs drop-shadow truncate">
                    {FEATURED_VIDEO.channelName}
                  </p>
                </div>
              </div>

              {/* Red YouTube Play Button */}
              <div className="relative z-10 w-16 h-11 sm:w-20 sm:h-14 bg-red-600 group-hover:bg-red-500 group-hover:scale-110 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300">
                <div className="w-0 h-0 border-y-7 sm:border-y-8 border-y-transparent border-l-12 sm:border-l-14 border-l-white ml-1" />
              </div>

              {/* Bottom tag */}
              <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-5 z-10">
                <span className="bg-black/70 backdrop-blur-xs px-2.5 py-1 rounded-md text-[11px] font-medium border border-white/10 text-white">
                  Click to Play
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Video Title and Details Below */}
        <div className="p-4 sm:p-6 bg-[#06111F] space-y-2">
          <h3 className="text-base sm:text-xl font-bold font-cinzel text-white leading-snug">
            {FEATURED_VIDEO.title}
          </h3>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            {FEATURED_VIDEO.description}
          </p>
        </div>
      </div>
    </div>
  );
};
