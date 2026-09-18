import React, { useState, useEffect, useMemo } from 'react';
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
  Crown,
  BookOpen,
  UserPlus,
  FileText,
  DollarSign,
  Settings,
  ShieldCheck,
  Phone,
  Briefcase,
} from 'lucide-react';
import { RegisteredMember } from '../../types';
import { subscribeToRegisteredMembers } from '../../firebase';

export const AboutClubTab: React.FC = () => {
  const [members, setMembers] = useState<RegisteredMember[]>([]);

  useEffect(() => {
    const unsub = subscribeToRegisteredMembers((data) => {
      setMembers(data);
    });
    return () => unsub();
  }, []);

  const roleHoldersMap = useMemo(() => {
    const map: Record<string, RegisteredMember | null> = {
      President: null,
      'Director of Learning': null,
      'Director of Membership': null,
      Secretary: null,
      'Financial Officer': null,
      'Operations Officer': null,
    };

    members.forEach((m) => {
      if (m.executiveRole && map[m.executiveRole] !== undefined) {
        map[m.executiveRole] = m;
      }
    });

    return map;
  }, [members]);

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

  const executiveRolesDetails = [
    {
      role: 'President',
      icon: Crown,
      badgeColor: 'text-amber-400 bg-amber-950/40 border-amber-500/50',
      work: 'Leads club sessions, presides over meetings, and represents the society.',
    },
    {
      role: 'Director of Learning',
      icon: BookOpen,
      badgeColor: 'text-sky-400 bg-sky-950/40 border-sky-500/50',
      work: 'Plans speech agendas, training pathways, and evaluation sessions.',
    },
    {
      role: 'Director of Membership',
      icon: UserPlus,
      badgeColor: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/50',
      work: 'Welcomes new members, manages onboarding, and tracks attendance.',
    },
    {
      role: 'Secretary',
      icon: FileText,
      badgeColor: 'text-purple-400 bg-purple-950/40 border-purple-500/50',
      work: 'Maintains meeting records, circulars, and official minutes.',
    },
    {
      role: 'Financial Officer',
      icon: DollarSign,
      badgeColor: 'text-teal-400 bg-teal-950/40 border-teal-500/50',
      work: 'Oversees club funds, budget planning, and event expenditures.',
    },
    {
      role: 'Operations Officer',
      icon: Settings,
      badgeColor: 'text-orange-400 bg-orange-950/40 border-orange-500/50',
      work: 'Manages meeting hall logistics, stage setup, and technical equipment.',
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
      <div className="rounded-3xl bg-gradient-to-br from-[#06111F] via-[#06111F] to-[#06111F] text-white p-6 sm:p-10 border border-[#BFA373]/40 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <SocietyLogo size="2xl" />
        </div>
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#BFA373]/20 text-[#BFA373] text-xs font-semibold uppercase tracking-wider border border-[#BFA373]/40">
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
      <div className="bg-[#06111F] rounded-2xl border border-[#BFA373]/30 p-6 sm:p-8 shadow-xl hover:border-[#BFA373]/60 transition-colors">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-[#06111F] border border-[#BFA373]/30 text-[#BFA373]">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold font-cinzel text-white">What is it?</h3>
        </div>
        <p className="text-slate-200 text-base leading-relaxed font-sans bg-[#06111F] p-5 rounded-xl border border-[#BFA373]/30">
          It is a <strong className="text-[#BFA373] font-semibold">student-led platform inspired by professional public-speaking club practices</strong>, but built exclusively for our students at Sri Amaraavathi College of Arts and Science.
        </p>
      </div>

      {/* 2. Executive Committee - 6 Core Leadership Roles */}
      <div className="bg-[#06111F] rounded-2xl border border-[#BFA373]/30 p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#BFA373]/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#06111F] border border-[#BFA373]/30 text-[#BFA373]">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-cinzel text-white">Leadership Roles (6 Core Positions)</h3>
              <p className="text-xs text-slate-400">Club Office Bearers elected to administer and lead society activities</p>
            </div>
          </div>
          <span className="self-start sm:self-auto text-xs font-bold font-cinzel text-[#BFA373] bg-[#BFA373]/15 px-3.5 py-1.5 rounded-full border border-[#BFA373]/40">
            6 CORE POSTINGS
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {executiveRolesDetails.map((item, idx) => {
            const Icon = item.icon;
            const holder = roleHoldersMap[item.role];

            return (
              <div
                key={item.role}
                className="p-4 sm:p-5 rounded-2xl bg-[#06111F] border border-[#BFA373]/30 hover:border-[#BFA373]/60 transition-all flex flex-col justify-between gap-3 shadow-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${item.badgeColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-white text-sm sm:text-base font-cinzel truncate">
                      {item.role}
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold font-cinzel text-slate-400 uppercase tracking-wider shrink-0 px-2 py-0.5 rounded bg-black/40 border border-[#BFA373]/30">
                    Role {idx + 1}
                  </span>
                </div>

                {/* Role Work in Simple Clear English Words */}
                <div className="bg-[#06111F]/70 rounded-xl p-2.5 border border-[#BFA373]/30/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#BFA373] font-cinzel">
                    <Briefcase className="w-3 h-3 text-[#BFA373]" />
                    <span>Work & Responsibility</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {item.work}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-[#BFA373]/30">
                  {holder ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        {holder.photoUrl ? (
                          <img
                            src={holder.photoUrl}
                            alt={holder.name}
                            className="w-7 h-7 rounded-full object-cover border border-[#BFA373]/60 shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-[#06111F] border border-[#BFA373]/60 text-[#BFA373] flex items-center justify-center font-bold text-xs shrink-0">
                            {holder.name ? holder.name[0].toUpperCase() : 'M'}
                          </div>
                        )}
                        <span className="font-semibold text-white text-sm truncate">
                          {holder.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-amber-300 pl-0.5">
                        <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        {holder.phone ? (
                          <a
                            href={`tel:${holder.phone}`}
                            className="hover:underline font-mono tracking-wide"
                          >
                            {holder.phone}
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">No mobile number</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="py-1">
                      <span className="text-xs text-slate-500 italic">Not Appointed</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. How it Works */}
      <div className="bg-[#06111F] rounded-2xl border border-[#BFA373]/30 p-6 sm:p-8 shadow-xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#06111F] border border-[#BFA373]/30 text-[#BFA373]">
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
              className="p-4 rounded-xl bg-[#06111F] border border-[#BFA373]/30 hover:border-[#BFA373]/60 transition-colors flex items-start gap-3"
            >
              <div className="w-6 h-6 rounded-full bg-[#06111F] border border-[#BFA373]/50 text-[#BFA373] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 font-cinzel">
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

      {/* 4. Meeting Structure */}
      <div className="bg-[#06111F] rounded-2xl border border-[#BFA373]/30 p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#BFA373]/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#06111F] border border-[#BFA373]/30 text-[#BFA373]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-cinzel text-white">Meeting Structure</h3>
              <p className="text-xs text-slate-400">Standard 90-minute session breakdown for maximum impact</p>
            </div>
          </div>
          <span className="self-start sm:self-auto text-xs font-bold font-cinzel text-[#BFA373] bg-[#BFA373]/15 px-3.5 py-1.5 rounded-full border border-[#BFA373]/40">
            TOTAL: 90 MINUTES
          </span>
        </div>

        <div className="space-y-4">
          {meetingTimeline.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-[#BFA373]/30 bg-[#06111F] hover:border-[#BFA373]/50 transition-all"
              >
                {/* Time Badge */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-[#06111F] border border-[#BFA373]/30 text-[#BFA373] flex items-center justify-center shrink-0">
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
