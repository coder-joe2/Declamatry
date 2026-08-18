import React from 'react';
import { Trophy, Medal, Award, Flame, Star, Sparkles } from 'lucide-react';
import { UserProfile } from '../../types';

interface LeaderboardTabProps {
  userProfile: UserProfile;
}

export const LeaderboardTab: React.FC<LeaderboardTabProps> = ({ userProfile }) => {
  const topSpeakers = [
    { rank: 1, name: 'S. Kaviya', dept: 'B.Sc Computer Science', year: 'III Year', points: 850, speeches: 12, badge: 'Master Orator' },
    { rank: 2, name: 'R. Vignesh', dept: 'B.Com CA', year: 'II Year', points: 720, speeches: 10, badge: 'Executive Speaker' },
    { rank: 3, name: 'M. Divya', dept: 'BCA', year: 'III Year', points: 690, speeches: 9, badge: 'Advanced Speaker' },
    { rank: 4, name: userProfile.name || 'Current Member', dept: userProfile.department || 'B.Sc', year: userProfile.year || 'I Year', points: 450, speeches: 5, badge: 'Competent Speaker', isCurrent: true },
    { rank: 5, name: 'A. Rahul', dept: 'BBA', year: 'I Year', points: 410, speeches: 4, badge: 'Developing Speaker' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn text-slate-100">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-[#02050B] via-[#0A192F] to-[#040A17] text-white p-6 sm:p-10 border border-[#C5A880]/40 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C5A880]/20 text-[#C5A880] text-xs font-semibold uppercase tracking-wider border border-[#C5A880]/40">
            <Trophy className="w-3.5 h-3.5" />
            <span>Club Recognition</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold font-cinzel text-white tracking-wide">
            Society Leaderboard
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Celebrating consistent participation, keynote deliveries, and impromptu speaking excellence.
          </p>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {topSpeakers.slice(0, 3).map((speaker, idx) => {
          const medalColors = [
            'from-amber-400 to-amber-600 border-amber-300 text-[#0A192F]',
            'from-slate-300 to-slate-400 border-slate-200 text-[#0A192F]',
            'from-amber-600 to-amber-800 border-amber-700 text-white',
          ];
          return (
            <div
              key={idx}
              className={`p-6 rounded-2xl bg-[#050B14] border border-[#1E2E48] shadow-xl flex flex-col items-center text-center space-y-3 relative overflow-hidden ${
                idx === 0 ? 'ring-2 ring-[#C5A880] border-[#C5A880]' : ''
              }`}
            >
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${medalColors[idx]} border flex items-center justify-center font-cinzel font-bold text-lg shadow-md`}>
                #{speaker.rank}
              </div>
              <div>
                <h4 className="font-bold font-cinzel text-lg text-white">{speaker.name}</h4>
                <p className="text-xs text-slate-400">{speaker.year} &bull; {speaker.dept}</p>
              </div>
              <div className="px-3 py-1 rounded-full bg-[#0B1528] text-[#C5A880] text-xs font-semibold font-cinzel border border-[#1E2E48]">
                {speaker.badge}
              </div>
              <div className="pt-2 flex items-center gap-4 text-xs font-semibold text-slate-300">
                <span>🔥 {speaker.points} Points</span>
                <span>🎤 {speaker.speeches} Speeches</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Leaderboard Table */}
      <div className="bg-[#050B14] rounded-2xl border border-[#1E2E48] shadow-xl overflow-hidden">
        <div className="p-5 border-b border-[#1E2E48] flex items-center justify-between">
          <h3 className="font-bold font-cinzel text-lg text-white">All Member Standings</h3>
          <span className="text-xs text-slate-400 font-sans">Updated weekly after each club session</span>
        </div>

        <div className="divide-y divide-[#1E2E48]">
          {topSpeakers.map((member) => (
            <div
              key={member.rank}
              className={`p-4 sm:p-5 flex items-center justify-between gap-4 transition-colors ${
                member.isCurrent ? 'bg-[#C5A880]/15 border-l-4 border-[#C5A880]' : 'hover:bg-[#0B1528]'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <span className="w-8 h-8 rounded-lg bg-[#0B1528] border border-[#1E2E48] text-[#C5A880] text-xs font-bold font-cinzel flex items-center justify-center">
                  #{member.rank}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-sm sm:text-base font-cinzel">
                      {member.name}
                    </h4>
                    {member.isCurrent && (
                      <span className="px-2 py-0.5 rounded-full bg-[#C5A880] text-[#0A192F] text-[10px] font-bold">
                        YOU
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{member.year} &bull; {member.dept}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:gap-6 text-right">
                <div>
                  <p className="text-xs sm:text-sm font-bold text-[#C5A880] font-cinzel">
                    {member.points} pts
                  </p>
                  <p className="text-[11px] text-slate-400">{member.speeches} speeches</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
