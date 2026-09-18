import React from 'react';
import { SocietyLogo } from '../SocietyLogo';
import { 
  Sprout, 
  Megaphone, 
  Target, 
  TrendingUp, 
  Crown, 
  Star, 
  Calendar, 
  Trophy, 
  Award, 
  CheckCircle 
} from 'lucide-react';
import { UserProfile } from '../../types';

interface LevelsTabProps {
  userProfile: UserProfile;
}

export const LevelsTab: React.FC<LevelsTabProps> = ({ userProfile }) => {
  const pathwayLevels = [
    {
      levelNumber: 1,
      title: 'FOUNDATION SPEAKER',
      goal: 'Build confidence and overcome stage fear.',
      icon: Sprout,
      iconBg: 'bg-emerald-950 text-emerald-300 border-emerald-500/50',
      badgeTitle: 'FOUNDATION SPEAKER BADGE',
      badgeType: 'bronze',
      milestones: [
        'Introduce Yourself (Ice Breaker)',
        'Deliver a 3 – 5 minute prepared speech',
        'Use proper speech structure (Opening, Body, Conclusion)',
        'Complete 3 Table Topics',
      ],
    },
    {
      levelNumber: 2,
      title: 'EFFECTIVE COMMUNICATOR',
      goal: 'Learn to communicate clearly and effectively.',
      icon: Megaphone,
      iconBg: 'bg-cyan-950 text-cyan-300 border-cyan-500/50',
      badgeTitle: 'EFFECTIVE COMMUNICATOR BADGE',
      badgeType: 'silver',
      milestones: [
        'Speech on an informative topic',
        'Speech using stories/examples',
        'Speech with visual aids',
        'Serve as Host once',
        'Complete 5 Table Topics',
      ],
    },
    {
      levelNumber: 3,
      title: 'PERSUASIVE SPEAKER',
      goal: 'Influence and inspire others.',
      icon: Target,
      iconBg: 'bg-amber-950 text-amber-300 border-amber-500/50',
      badgeTitle: 'PERSUASIVE SPEAKER BADGE',
      badgeType: 'gold',
      milestones: [
        'Persuasive Speech',
        'Motivational Speech',
        'Debate or Panel Discussion Participation',
        'Serve as Feedback Partner twice',
        'Complete 8 Table Topics',
      ],
    },
    {
      levelNumber: 4,
      title: 'ADVANCED PRESENTER',
      goal: 'Master professional presentations.',
      icon: TrendingUp,
      iconBg: 'bg-purple-950 text-purple-300 border-purple-500/50',
      badgeTitle: 'ADVANCED PRESENTER MEDAL',
      badgeType: 'purple',
      milestones: [
        'Technical Presentation',
        'Seminar / Workshop Delivery',
        'Speech using audience interaction',
        'Serve as Master Evaluator',
        'Complete 10 Table Topics',
      ],
    },
    {
      levelNumber: 5,
      title: 'MASTER ORATOR',
      goal: 'Demonstrate excellence in communication and leadership.',
      icon: Crown,
      iconBg: 'bg-[#06111F] text-[#BFA373] border-[#BFA373]',
      badgeTitle: 'MASTER ORATOR AWARD',
      badgeType: 'master',
      milestones: [
        'Keynote Speech (10 – 15 minutes)',
        'Mentor a Junior Member',
        'Lead a Special Session',
        'Participate in Intercollegiate Competition',
        'Complete Communication Portfolio',
      ],
    },
  ];

  // Render visual badges matching the poster design
  const renderBadge = (type: string, title: string) => {
    switch (type) {
      case 'bronze':
        return (
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-700 via-amber-800 to-amber-950 border-2 border-amber-500 shadow-md flex items-center justify-center p-1 relative">
              <div className="w-12 h-12 rounded-full border border-amber-400/40 flex items-center justify-center bg-amber-900/50">
                <Star className="w-6 h-6 text-amber-300 fill-amber-300 drop-shadow" />
              </div>
            </div>
            <span className="text-[10px] font-bold font-cinzel text-[#BFA373] uppercase mt-2 tracking-wider max-w-[110px] text-center leading-tight">
              {title}
            </span>
          </div>
        );
      case 'silver':
        return (
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-400 via-slate-600 to-slate-800 border-2 border-slate-300 shadow-md flex items-center justify-center p-1 relative">
              <div className="w-12 h-12 rounded-full border border-white/60 flex items-center justify-center bg-slate-700/50">
                <Star className="w-6 h-6 text-white fill-white drop-shadow" />
              </div>
            </div>
            <span className="text-[10px] font-bold font-cinzel text-slate-300 uppercase mt-2 tracking-wider max-w-[110px] text-center leading-tight">
              {title}
            </span>
          </div>
        );
      case 'gold':
        return (
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 border-2 border-yellow-300 shadow-md flex items-center justify-center p-1 relative">
              <div className="w-12 h-12 rounded-full border border-yellow-200 flex items-center justify-center bg-amber-700/40">
                <Star className="w-6 h-6 text-yellow-100 fill-yellow-100 drop-shadow" />
              </div>
            </div>
            <span className="text-[10px] font-bold font-cinzel text-[#BFA373] uppercase mt-2 tracking-wider max-w-[110px] text-center leading-tight">
              {title}
            </span>
          </div>
        );
      case 'purple':
        return (
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-700 via-purple-800 to-purple-950 border-2 border-purple-400 shadow-md flex items-center justify-center p-1 relative">
              <div className="w-12 h-12 rounded-full border border-purple-300/60 flex items-center justify-center bg-purple-900/60">
                <Star className="w-6 h-6 text-amber-300 fill-amber-300 drop-shadow" />
              </div>
            </div>
            <span className="text-[10px] font-bold font-cinzel text-purple-300 uppercase mt-2 tracking-wider max-w-[110px] text-center leading-tight">
              {title}
            </span>
          </div>
        );
      case 'master':
      default:
        return (
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#06111F] via-[#06111F] to-[#06111F] border-2 border-[#BFA373] shadow-xl flex items-center justify-center p-1 relative">
              <div className="w-12 h-12 rounded-full border border-[#BFA373]/50 flex items-center justify-center bg-[#BFA373]/20">
                <Crown className="w-6 h-6 text-[#BFA373] fill-[#BFA373]/30 drop-shadow" />
              </div>
            </div>
            <span className="text-[10px] font-bold font-cinzel text-[#BFA373] uppercase mt-2 tracking-wider max-w-[110px] text-center leading-tight">
              {title}
            </span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto text-slate-100">
      {/* Official Poster Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#06111F] via-[#06111F] to-[#06111F] border-2 border-[#BFA373]/60 p-6 sm:p-10 shadow-2xl text-center space-y-4">
        {/* Crest Logo Top Center */}
        <div className="flex justify-center">
          <SocietyLogo size="xl" className="shadow-2xl border-2 border-[#BFA373]/60" />
        </div>

        <div className="space-y-1.5">
          <h1 className="font-cinzel text-2xl sm:text-4xl font-extrabold text-white tracking-widest uppercase">
            The Declamate&apos;s Society
          </h1>
          <p className="text-xs sm:text-sm font-semibold tracking-widest text-[#BFA373] uppercase font-sans">
            A Public Speaking &amp; Leadership Club &bull; Sri Amaraavathi College of Arts and Science, Karur
          </p>

          {/* Ribbon Motto */}
          <div className="pt-2 flex justify-center">
            <div className="inline-block bg-[#06111F] text-white px-8 py-2 rounded-xl font-cinzel font-bold text-xs sm:text-sm tracking-[0.3em] shadow-lg border border-[#BFA373]/60">
              <span className="text-[#BFA373]">SPEAK</span> &bull; <span className="text-white">LEAD</span> &bull; <span className="text-[#BFA373]">INSPIRE</span>
            </div>
          </div>
        </div>

        {/* Pathway Title with Golden Stars */}
        <div className="pt-3 border-t border-[#BFA373]/30 max-w-xl mx-auto">
          <div className="flex items-center justify-center gap-2 text-[#BFA373]">
            <Star className="w-4 h-4 fill-[#BFA373]" />
            <h2 className="font-cinzel text-base sm:text-xl font-bold tracking-[0.2em] text-white uppercase">
              Presentation Mastery Pathway
            </h2>
            <Star className="w-4 h-4 fill-[#BFA373]" />
          </div>
          <p className="text-xs text-slate-400 font-sans tracking-widest uppercase mt-1 font-medium">
            A Journey from Confidence to Impact
          </p>
        </div>
      </div>

      {/* 5 Pathway Levels List */}
      <div className="space-y-5">
        {pathwayLevels.map((lvl) => {
          const Icon = lvl.icon;
          return (
            <div
              key={lvl.levelNumber}
              className="bg-[#06111F] rounded-2xl border-2 border-[#BFA373]/30 hover:border-[#BFA373] shadow-xl hover:shadow-2xl transition-all p-5 sm:p-7 relative overflow-hidden"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                
                {/* Left Column: Level Badge & Name */}
                <div className="lg:col-span-4 flex items-start sm:items-center gap-4">
                  {/* Level Number & Icon Box */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-[#06111F] text-white border-2 border-[#BFA373] flex flex-col items-center justify-center shadow-md">
                      <span className="text-[9px] font-cinzel tracking-wider text-[#BFA373] uppercase leading-none">
                        LEVEL
                      </span>
                      <span className="text-xl font-cinzel font-bold leading-none mt-0.5 text-white">
                        {lvl.levelNumber}
                      </span>
                    </div>
                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center -mt-2.5 z-10 shadow-sm ${lvl.iconBg}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Level Title & Goal */}
                  <div className="space-y-1">
                    <h3 className="font-cinzel text-lg sm:text-xl font-bold text-white tracking-wide">
                      {lvl.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 font-sans leading-snug">
                      {lvl.goal}
                    </p>
                  </div>
                </div>

                {/* Middle Column: Milestones Checklist */}
                <div className="lg:col-span-5 bg-[#06111F] rounded-xl p-4 border border-[#BFA373]/30 space-y-2">
                  <div className="inline-block bg-[#06111F] border border-[#BFA373]/30 text-[#BFA373] text-[10px] font-cinzel font-bold px-3 py-0.5 rounded tracking-wider mb-1">
                    MILESTONES
                  </div>
                  <ul className="space-y-1.5">
                    {lvl.milestones.map((milestone, mIdx) => (
                      <li key={mIdx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-200 font-sans">
                        <CheckCircle className="w-4 h-4 text-[#BFA373] shrink-0 mt-0.5" />
                        <span>{milestone}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right Column: Recognition Badge */}
                <div className="lg:col-span-3 flex flex-col items-center justify-center border-t lg:border-t-0 lg:border-l border-[#BFA373]/30 pt-4 lg:pt-0 lg:pl-4">
                  <div className="inline-block bg-[#06111F] border border-[#BFA373]/30 text-[#BFA373] text-[10px] font-cinzel font-bold px-3 py-0.5 rounded tracking-wider mb-2.5">
                    RECOGNITION
                  </div>
                  {renderBadge(lvl.badgeType, lvl.badgeTitle)}
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Highlights Section */}
      <div className="space-y-3">
        <div className="flex justify-center">
          <div className="inline-block bg-[#06111F] text-[#BFA373] text-xs font-cinzel font-bold px-5 py-1.5 rounded-lg tracking-[0.25em] shadow-md border border-[#BFA373]/50">
            ADDITIONAL HIGHLIGHTS
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          {/* Highlight 1: Meeting Frequency */}
          <div className="bg-[#06111F] rounded-2xl border border-[#BFA373]/30 p-6 shadow-xl flex items-start gap-4">
            <div className="p-3 rounded-xl bg-amber-950/70 text-amber-300 border border-amber-500/40 shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-cinzel text-sm font-bold text-white tracking-wide">
                MEETING FREQUENCY
              </h4>
              <p className="text-sm font-semibold text-slate-200">Once Every Week</p>
              <p className="text-xs text-slate-400">~ 30 – 35 Meetings per Academic Year</p>
            </div>
          </div>

          {/* Highlight 2: Annual Events */}
          <div className="bg-[#06111F] rounded-2xl border border-[#BFA373]/30 p-6 shadow-xl flex items-start gap-4">
            <div className="p-3 rounded-xl bg-blue-950/70 text-blue-300 border border-blue-500/40 shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-cinzel text-sm font-bold text-white tracking-wide">
                ANNUAL EVENTS
              </h4>
              <ul className="text-xs text-slate-300 space-y-0.5 font-medium">
                <li>&bull; Speech Contest (Each Semester)</li>
                <li>&bull; Leadership Workshop (Each Semester)</li>
                <li>&bull; Annual Showcase Event</li>
              </ul>
            </div>
          </div>

          {/* Highlight 3: Final Achievement */}
          <div className="bg-[#06111F] rounded-2xl border border-[#BFA373]/30 p-6 shadow-xl flex items-start gap-4">
            <div className="p-3 rounded-xl bg-purple-950/70 text-purple-300 border border-purple-500/40 shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-cinzel text-sm font-bold text-white tracking-wide">
                FINAL ACHIEVEMENT
              </h4>
              <p className="text-xs text-slate-300">
                Complete all milestones and become a{' '}
                <strong className="text-[#BFA373] block font-bold font-cinzel text-xs sm:text-sm mt-0.5">
                  CERTIFIED DECLAMATE!
                </strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Inspirational Motto Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#06111F] via-[#06111F] to-[#06111F] text-white p-5 sm:p-6 text-center border border-[#BFA373]/50 shadow-xl">
        <div className="flex items-center justify-center gap-2 text-[#BFA373] mb-1">
          <Star className="w-4 h-4 fill-[#BFA373]" />
          <p className="text-xs sm:text-sm md:text-base font-cinzel font-bold tracking-wider italic">
            &ldquo;Every speech is a step. Every milestone is a victory. Every Declamate is a leader in the making.&rdquo;
          </p>
          <Star className="w-4 h-4 fill-[#BFA373]" />
        </div>
      </div>
    </div>
  );
};
