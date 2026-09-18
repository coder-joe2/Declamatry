import React from 'react';
import { UserProfile, formatSpeakerRole } from '../../types';
import { User, Mail, Phone, GraduationCap, Calendar, ShieldCheck, Edit3, Crown, Mic } from 'lucide-react';
import { SocietyLogo } from '../SocietyLogo';

interface ProfileTabProps {
  userProfile: UserProfile;
  onEditProfile: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ userProfile, onEditProfile }) => {
  // If speakerRoles is an array (even if empty []), respect it!
  const userSpeakerRoles = React.useMemo(() => {
    if (Array.isArray(userProfile.speakerRoles)) {
      return userProfile.speakerRoles.filter(Boolean);
    }
    if (typeof userProfile.speakerRole === 'string' && userProfile.speakerRole.trim()) {
      return userProfile.speakerRole.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }, [userProfile.speakerRoles, userProfile.speakerRole]);

  const hasSpeakerRole = userSpeakerRoles.length > 0;
  const primarySpeakerRole = hasSpeakerRole ? formatSpeakerRole(userSpeakerRoles[0]) : '';

  return (
    <div className="space-y-8 animate-fadeIn text-slate-100">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-[#06111F] via-[#06111F] to-[#06111F] text-white p-6 sm:p-10 border border-[#BFA373]/40 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 justify-between">
          <div className="flex items-center gap-5">
            <div
              onClick={onEditProfile}
              title="Click to edit profile & photo"
              className="relative cursor-pointer group"
            >
              {userProfile.photoUrl ? (
                <img
                  src={userProfile.photoUrl}
                  alt={userProfile.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-[#BFA373] shadow-2xl group-hover:scale-105 group-hover:border-white transition-all"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#06111F] border-4 border-[#BFA373] flex items-center justify-center text-[#BFA373] shadow-2xl group-hover:scale-105 transition-all">
                  <User className="w-10 h-10" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Edit3 className="w-6 h-6" />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#BFA373]/20 text-[#BFA373] text-[11px] font-semibold uppercase tracking-wider border border-[#BFA373]/40">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verified Member</span>
                </div>
                {userProfile.executiveRole && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold uppercase tracking-wider border border-amber-500/40">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span>EC: {userProfile.executiveRole}</span>
                  </div>
                )}
                {userSpeakerRoles.map((sRole) => (
                  <div
                    key={sRole}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-950/60 text-purple-300 text-[11px] font-bold uppercase tracking-wider border border-purple-500/40"
                  >
                    <Mic className="w-3 h-3 text-purple-400" />
                    <span>{formatSpeakerRole(sRole)}</span>
                  </div>
                ))}
              </div>
              <h2 className="text-xl sm:text-3xl font-bold font-cinzel text-white">
                {userProfile.name || 'Member'}
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm font-sans mt-0.5">
                {userProfile.year || 'I Year'} &bull; {userProfile.department || 'General'}{userProfile.className ? ` (${userProfile.className})` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onEditProfile}
            className="bg-[#BFA373] hover:bg-[#BFA373] text-[#06111F] font-cinzel font-bold text-xs sm:text-sm py-2.5 px-5 rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* Member Information Details Card */}
      <div className="bg-[#06111F] rounded-2xl border border-[#BFA373]/30 p-6 sm:p-8 shadow-xl space-y-6">
        <h3 className="font-cinzel text-lg font-bold text-white pb-3 border-b border-[#BFA373]/30">
          Member Credentials
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-4 rounded-xl bg-[#06111F] border border-[#BFA373]/30 flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-[#06111F] border border-[#BFA373]/30 text-[#BFA373]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-sans">Full Name</p>
              <p className="font-semibold text-white text-sm">{userProfile.name || 'Not provided'}</p>
            </div>
          </div>

          {userProfile.executiveRole ? (
            <div className="p-4 rounded-xl bg-[#06111F] border border-amber-500/40 flex items-center gap-3.5 shadow-sm">
              <div className="p-2.5 rounded-lg bg-[#06111F] border border-amber-500/40 text-amber-400">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-amber-400/80 font-sans font-semibold">Executive Committee Post</p>
                <p className="font-bold text-amber-300 text-sm font-cinzel">{userProfile.executiveRole}</p>
              </div>
            </div>
          ) : hasSpeakerRole ? (
            <div className="p-4 rounded-xl bg-[#06111F] border border-purple-500/40 flex items-center gap-3.5 shadow-sm">
              <div className="p-2.5 rounded-lg bg-[#06111F] border border-purple-500/40 text-purple-400">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-purple-400/80 font-sans font-semibold">Speaker Honor</p>
                <p className="font-bold text-purple-300 text-sm font-cinzel">{primarySpeakerRole}</p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#06111F] border border-[#BFA373]/30 flex items-center gap-3.5">
              <div className="p-2.5 rounded-lg bg-[#06111F] border border-[#BFA373]/30 text-[#BFA373]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-sans">Club Role</p>
                <p className="font-semibold text-white text-sm">General Society Member</p>
              </div>
            </div>
          )}

          {hasSpeakerRole && userProfile.executiveRole && (
            <div className="p-4 rounded-xl bg-[#06111F] border border-purple-500/40 flex items-center gap-3.5 shadow-sm md:col-span-2">
              <div className="p-2.5 rounded-lg bg-[#06111F] border border-purple-500/40 text-purple-400">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-purple-400/80 font-sans font-semibold">Speaker Honor</p>
                <p className="font-bold text-purple-300 text-sm font-cinzel">{primarySpeakerRole}</p>
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-[#06111F] border border-[#BFA373]/30 flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-[#06111F] border border-[#BFA373]/30 text-[#BFA373]">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-sans">Email Address</p>
              <p className="font-semibold text-white text-sm">{userProfile.gmail || 'Not provided'}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#06111F] border border-[#BFA373]/30 flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-[#06111F] border border-[#BFA373]/30 text-[#BFA373]">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-sans">Phone Number</p>
              <p className="font-semibold text-white text-sm">{userProfile.phone || 'Not provided'}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#06111F] border border-[#BFA373]/30 flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-[#06111F] border border-[#BFA373]/30 text-[#BFA373]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-sans">Year of Study</p>
              <p className="font-semibold text-white text-sm">{userProfile.year || 'Not selected'}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#06111F] border border-[#BFA373]/30 flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-[#06111F] border border-[#BFA373]/30 text-[#BFA373]">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-sans">Department</p>
              <p className="font-semibold text-white text-sm">{userProfile.department || 'Not selected'}</p>
            </div>
          </div>

          {userProfile.className ? (
            <div className="p-4 rounded-xl bg-[#06111F] border border-[#BFA373]/30 flex items-center gap-3.5">
              <div className="p-2.5 rounded-lg bg-[#06111F] border border-[#BFA373]/30 text-[#BFA373]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-sans">Class / Specialization</p>
                <p className="font-semibold text-white text-sm">{userProfile.className}</p>
              </div>
            </div>
          ) : null}

          <div className={`p-4 rounded-xl bg-[#06111F] border border-[#BFA373]/30 flex items-center gap-3.5 ${!userProfile.className ? 'md:col-span-1' : 'md:col-span-2'}`}>
            <div className="p-2.5 rounded-lg bg-[#06111F] border border-[#BFA373]/30 text-[#BFA373]">
              <SocietyLogo size="sm" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-sans">Institution / College</p>
              <p className="font-semibold text-white text-sm">
                Sri Amaraavathi College of Arts and Science, Karur
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
