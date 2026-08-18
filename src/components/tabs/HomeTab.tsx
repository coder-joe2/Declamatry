import React from 'react';
import { SocietyLogo } from '../SocietyLogo';
import { Sparkles, Mic, Compass, Award, ArrowRight, Quote } from 'lucide-react';
import { UserProfile } from '../../types';

interface HomeTabProps {
  userProfile: UserProfile;
  onNavigateTab: (tab: 'About Club' | 'Learning Tips' | 'Leaderboard' | 'Levels') => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({ userProfile, onNavigateTab }) => {
  return (
    <div className="space-y-8 animate-fadeIn text-slate-100">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#02050B] via-[#0A192F] to-[#040A17] text-white p-6 sm:p-10 border border-[#C5A880]/40 shadow-2xl">
        {/* Decorative Golden Ambient Circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#C5A880]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#C5A880]/5 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 sm:gap-8 justify-between">
          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C5A880]/15 border border-[#C5A880]/40 text-[#C5A880] text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Public Speaking &amp; Leadership Club</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-bold font-cinzel tracking-wide text-white leading-tight">
              Welcome to <br />
              <span className="text-[#C5A880] drop-shadow-sm">The Declamate&apos;s Society</span>
            </h2>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl font-sans">
              It is a Public Speaking &amp; Leadership Club located at <strong className="text-white font-medium">Sri Amaraavathi College of Arts and Science, Karur</strong>.
            </p>

            {/* Motto Badge */}
            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
              <div className="px-5 py-2 rounded-xl bg-[#030712]/80 backdrop-blur-xs border border-[#C5A880]/60 text-white font-cinzel font-bold text-sm tracking-[0.2em] shadow-inner">
                MOTTO: <span className="text-[#C5A880]">SPEAK • LEAD • INSPIRE</span>
              </div>
            </div>
          </div>

          {/* Logo Crest Showcase */}
          <div className="shrink-0 flex flex-col items-center">
            <div className="p-2 rounded-full bg-[#030712]/70 backdrop-blur-md border-2 border-[#C5A880]/60 shadow-2xl">
              <SocietyLogo size="xl" className="shadow-2xl" />
            </div>
            <p className="mt-2 text-[11px] font-cinzel text-[#C5A880] uppercase tracking-widest text-center">
              SACAS • Karur
            </p>
          </div>
        </div>
      </div>

      {/* Core Idea Section */}
      <div className="relative overflow-hidden rounded-2xl bg-[#050B14] border border-[#C5A880]/50 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 left-0 w-2 h-full bg-[#C5A880]" />
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-[#0B1528] text-[#C5A880] shrink-0 shadow-md border border-[#1E2E48]">
            <Quote className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#C5A880] font-cinzel">
              Our Core Idea
            </h3>
            <p className="text-slate-100 text-base sm:text-lg font-playfair italic leading-relaxed font-medium">
              &ldquo;College gives us knowledge, but the world expects us to express it confidently. Here, you will leave with real experiences—not just attendance.&rdquo;
            </p>
            <p className="text-xs text-slate-400 font-sans pt-1">
              — The Declamate&apos;s Society Philosophy
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: About Club */}
        <div 
          onClick={() => onNavigateTab('About Club')}
          className="group p-6 rounded-2xl bg-[#050B14] border border-[#1E2E48] hover:border-[#C5A880] shadow-md hover:shadow-xl hover:shadow-[#C5A880]/5 transition-all cursor-pointer flex flex-col justify-between space-y-4"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#0B1528] border border-[#1E2E48] text-[#C5A880] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Compass className="w-6 h-6" />
            </div>
            <h4 className="font-cinzel text-lg font-bold text-white group-hover:text-[#C5A880] transition-colors">About the Club</h4>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Explore how our student-led club works, how meetings run, and our structured 5-part session format.
            </p>
          </div>
          <div className="flex items-center text-xs font-bold font-cinzel text-[#C5A880] tracking-wider pt-2">
            <span>EXPLORE CLUB</span>
            <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Learning Tips */}
        <div 
          onClick={() => onNavigateTab('Learning Tips')}
          className="group p-6 rounded-2xl bg-[#050B14] border border-[#1E2E48] hover:border-[#C5A880] shadow-md hover:shadow-xl hover:shadow-[#C5A880]/5 transition-all cursor-pointer flex flex-col justify-between space-y-4"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#0B1528] border border-[#1E2E48] text-[#C5A880] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Mic className="w-6 h-6" />
            </div>
            <h4 className="font-cinzel text-lg font-bold text-white group-hover:text-[#C5A880] transition-colors">Learning Tips</h4>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Master simple &amp; practical speaking advice: 3-Second Rule, Active Listening, Posture, and more.
            </p>
          </div>
          <div className="flex items-center text-xs font-bold font-cinzel text-[#C5A880] tracking-wider pt-2">
            <span>READ PRACTICAL TIPS</span>
            <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: Growth & Experience */}
        <div 
          onClick={() => onNavigateTab('Levels')}
          className="group p-6 rounded-2xl bg-[#050B14] border border-[#1E2E48] hover:border-[#C5A880] shadow-md hover:shadow-xl hover:shadow-[#C5A880]/5 transition-all cursor-pointer flex flex-col justify-between space-y-4 sm:col-span-2 lg:col-span-1"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#0B1528] border border-[#1E2E48] text-[#C5A880] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Award className="w-6 h-6" />
            </div>
            <h4 className="font-cinzel text-lg font-bold text-white group-hover:text-[#C5A880] transition-colors">Leadership &amp; Levels</h4>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              Advance from Novice Speaker to Master Orator through structured stages of speaking and leadership.
            </p>
          </div>
          <div className="flex items-center text-xs font-bold font-cinzel text-[#C5A880] tracking-wider pt-2">
            <span>VIEW LEVELS</span>
            <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};
