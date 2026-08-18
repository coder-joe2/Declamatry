import React from 'react';
import { SocietyLogo } from '../SocietyLogo';
import { 
  Users, 
  Sparkles, 
  Clock, 
  Mic2, 
  Flame, 
  CheckCircle2, 
  Award, 
  Layers, 
} from 'lucide-react';

export const AboutClubTab: React.FC = () => {
  const meetingTimeline = [
    {
      time: '10 min',
      title: 'Opening & Welcome',
      desc: 'Welcome, theme introduction, and role introductions by session leaders.',
      icon: Users,
      badgeColor: 'bg-blue-950/70 text-blue-300 border-blue-500/40',
    },
    {
      time: '30 min',
      title: 'Keynote Speeches',
      desc: 'Members deliver structured, planned speeches on diverse engaging topics.',
      icon: Mic2,
      badgeColor: 'bg-amber-950/70 text-amber-300 border-amber-500/40',
    },
    {
      time: '20 min',
      title: 'Quick Think Session',
      desc: 'Exciting impromptu speaking challenges to sharpen quick reasoning and spontaneity.',
      icon: Flame,
      badgeColor: 'bg-orange-950/70 text-orange-300 border-orange-500/40',
    },
    {
      time: '20 min',
      title: 'Evaluation & Feedback',
      desc: 'Helpful, constructive feedback and actionable learning points for each speaker.',
      icon: CheckCircle2,
      badgeColor: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40',
    },
    {
      time: '10 min',
      title: 'Awards & Announcements',
      desc: 'Recognition for best speakers, club updates, and upcoming session calendar.',
      icon: Award,
      badgeColor: 'bg-purple-950/70 text-purple-300 border-purple-500/40',
    },
  ];

  const pillars = [
    { text: 'Delivering Speeches', desc: 'Crafting and presenting structured speeches to diverse audiences.' },
    { text: 'Speaking Impromptu', desc: 'Thinking fast on your feet during spontaneous Table Topics.' },
    { text: 'Constructive Feedback', desc: 'Receiving respectful, actionable evaluations to accelerate growth.' },
    { text: 'Leadership Roles', desc: 'Running club meetings, timing, and moderating sessions.' },
    { text: 'Organising Events', desc: 'Coordinating workshops, inter-college events, and guest meets.' },
    { text: 'Supporting Growth', desc: 'Fostering a positive, encouraging environment for all students.' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn text-slate-100">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-[#02050B] via-[#0A192F] to-[#040A17] text-white p-6 sm:p-10 border border-[#C5A880]/40 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <SocietyLogo size="2xl" />
        </div>
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C5A880]/20 text-[#C5A880] text-xs font-semibold uppercase tracking-wider border border-[#C5A880]/40">
            <Users className="w-3.5 h-3.5" />
            <span>Club Overview &amp; Structure</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold font-cinzel text-white tracking-wide">
            About The Declamate&apos;s Society
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Sri Amaraavathi College of Arts and Science, Karur &bull; A student-led public speaking and leadership movement.
          </p>
        </div>
      </div>

      {/* 1. What is it? */}
      <div className="bg-[#050B14] rounded-2xl border border-[#1E2E48] p-6 sm:p-8 shadow-xl hover:border-[#C5A880]/60 transition-colors">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-[#0B1528] border border-[#1E2E48] text-[#C5A880]">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold font-cinzel text-white">What is it?</h3>
        </div>
        <p className="text-slate-200 text-base leading-relaxed font-sans bg-[#0B1528] p-5 rounded-xl border border-[#1E2E48]">
          It is a <strong className="text-[#C5A880] font-semibold">student-led platform inspired by professional public-speaking club practices</strong>, but built exclusively for our students at Sri Amaraavathi College of Arts and Science.
        </p>
      </div>

      {/* 2. How it Works */}
      <div className="bg-[#050B14] rounded-2xl border border-[#1E2E48] p-6 sm:p-8 shadow-xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#0B1528] border border-[#1E2E48] text-[#C5A880]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-cinzel text-white">How It Works</h3>
            <p className="text-xs text-slate-400">Learning through real practice, teamwork, and mutual encouragement</p>
          </div>
        </div>

        <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
          Members learn by actively participating across every aspect of the society:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {pillars.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-[#0B1528] border border-[#1E2E48] hover:border-[#C5A880]/60 transition-colors flex items-start gap-3"
            >
              <div className="w-6 h-6 rounded-full bg-[#030712] border border-[#C5A880]/50 text-[#C5A880] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 font-cinzel">
                {idx + 1}
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">{item.text}</h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Meeting Structure */}
      <div className="bg-[#050B14] rounded-2xl border border-[#1E2E48] p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1E2E48]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#0B1528] border border-[#1E2E48] text-[#C5A880]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-cinzel text-white">Meeting Structure</h3>
              <p className="text-xs text-slate-400">Standard 90-minute session breakdown for maximum impact</p>
            </div>
          </div>
          <span className="self-start sm:self-auto text-xs font-bold font-cinzel text-[#C5A880] bg-[#C5A880]/15 px-3.5 py-1.5 rounded-full border border-[#C5A880]/40">
            TOTAL: 90 MINUTES
          </span>
        </div>

        <div className="space-y-4">
          {meetingTimeline.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-[#1E2E48] bg-[#0B1528] hover:border-[#C5A880]/50 transition-all"
              >
                {/* Time Badge */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-[#030712] border border-[#1E2E48] text-[#C5A880] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider font-cinzel border ${item.badgeColor}`}>
                    {item.time}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white text-sm sm:text-base font-cinzel">
                    {item.title}
                  </h4>
                  <p className="text-slate-300 text-xs sm:text-sm mt-0.5 leading-relaxed font-sans">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
