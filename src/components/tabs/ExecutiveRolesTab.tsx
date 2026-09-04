import React, { useState, useEffect, useMemo } from 'react';
import {
  Crown,
  BookOpen,
  UserPlus,
  FileText,
  DollarSign,
  Settings,
  Award,
  Search,
  Check,
  ShieldCheck,
  Mail,
  Phone,
  GraduationCap,
  Sparkles,
  RefreshCw,
  UserX,
  CheckCircle2,
  ChevronRight,
  User,
  ArrowRight,
  Info,
  X,
  Briefcase
} from 'lucide-react';
import { UserProfile, RegisteredMember, EXECUTIVE_ROLES_LIST, ExecutiveCommitteeRole } from '../../types';
import { subscribeToRegisteredMembers, updateMemberExecutiveRole } from '../../firebase';
import { SocietyLogo } from '../SocietyLogo';

interface ExecutiveRolesTabProps {
  userProfile: UserProfile;
}

const getRoleVisuals = (role: string) => {
  switch (role) {
    case 'President':
      return {
        icon: Crown,
        badgeBg: 'bg-amber-950/60',
        badgeText: 'text-amber-300',
        border: 'border-amber-500/50',
        accentBg: 'bg-amber-500/10',
        colorHex: '#F59E0B',
        rank: 'Role #1',
      };
    case 'Director of Learning':
      return {
        icon: BookOpen,
        badgeBg: 'bg-sky-950/60',
        badgeText: 'text-sky-300',
        border: 'border-sky-500/50',
        accentBg: 'bg-sky-500/10',
        colorHex: '#38BDF8',
        rank: 'Role #2',
      };
    case 'Director of Membership':
      return {
        icon: UserPlus,
        badgeBg: 'bg-emerald-950/60',
        badgeText: 'text-emerald-300',
        border: 'border-emerald-500/50',
        accentBg: 'bg-emerald-500/10',
        colorHex: '#34D399',
        rank: 'Role #3',
      };
    case 'Secretary':
      return {
        icon: FileText,
        badgeBg: 'bg-purple-950/60',
        badgeText: 'text-purple-300',
        border: 'border-purple-500/50',
        accentBg: 'bg-purple-500/10',
        colorHex: '#C084FC',
        rank: 'Role #4',
      };
    case 'Financial Officer':
      return {
        icon: DollarSign,
        badgeBg: 'bg-teal-950/60',
        badgeText: 'text-teal-300',
        border: 'border-teal-500/50',
        accentBg: 'bg-teal-500/10',
        colorHex: '#2DD4BF',
        rank: 'Role #5',
      };
    case 'Operations Officer':
      return {
        icon: Settings,
        badgeBg: 'bg-orange-950/60',
        badgeText: 'text-orange-300',
        border: 'border-orange-500/50',
        accentBg: 'bg-orange-500/10',
        colorHex: '#FB923C',
        rank: 'Role #6',
      };
    default:
      return {
        icon: Award,
        badgeBg: 'bg-slate-900',
        badgeText: 'text-slate-300',
        border: 'border-slate-700',
        accentBg: 'bg-slate-800',
        colorHex: '#C5A880',
        rank: 'Office Bearer',
      };
  }
};

export const ExecutiveRolesTab: React.FC<ExecutiveRolesTabProps> = ({ userProfile }) => {
  const [members, setMembers] = useState<RegisteredMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRoleToAssign, setSelectedRoleToAssign] = useState<string | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedMemberModal, setSelectedMemberModal] = useState<RegisteredMember | null>(null);

  const isAdmin = Boolean(
    userProfile.isAdmin || userProfile.gmail?.toLowerCase() === 'vjana537@gmail.com'
  );

  useEffect(() => {
    const unsub = subscribeToRegisteredMembers((data) => {
      setMembers(data);
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Map each role to its current appointed member
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

  const totalAppointedCount = useMemo(() => {
    return Object.values(roleHoldersMap).filter(Boolean).length;
  }, [roleHoldersMap]);

  // Handle appointing a member to a role
  const handleAppoint = async (roleName: string, member: RegisteredMember) => {
    if (!isAdmin) {
      showToast('Admin privilege required to appoint committee roles.');
      return;
    }

    setIsUpdating(true);

    // Optimistic UI update
    setMembers((prev) =>
      prev.map((m) => {
        // If this member was already holding another role or someone else held this role
        if (m.id === member.id) {
          return { ...m, executiveRole: roleName };
        }
        if (m.executiveRole === roleName && m.id !== member.id) {
          return { ...m, executiveRole: '' }; // vacate previous holder
        }
        return m;
      })
    );

    const res = await updateMemberExecutiveRole(member.id || '', roleName);
    setIsUpdating(false);

    if (res.success) {
      showToast(`✓ Appointed ${member.name} as ${roleName}`);
      setSelectedRoleToAssign(null);
      setMemberSearchQuery('');
    } else {
      showToast(`Could not update: ${res.error || 'Please try again'}`);
    }
  };

  // Handle removing / vacating a role
  const handleVacateRole = async (roleName: string) => {
    const currentHolder = roleHoldersMap[roleName];
    if (!currentHolder || !currentHolder.id || !isAdmin) return;

    setIsUpdating(true);

    // Optimistic UI update
    setMembers((prev) =>
      prev.map((m) => (m.id === currentHolder.id ? { ...m, executiveRole: '' } : m))
    );

    const res = await updateMemberExecutiveRole(currentHolder.id, '');
    setIsUpdating(false);

    if (res.success) {
      showToast(`Role "${roleName}" is now vacant.`);
      setSelectedRoleToAssign(null);
    } else {
      showToast(`Could not vacate role: ${res.error}`);
    }
  };

  // Filter candidates for modal assignment picker
  const filteredCandidates = useMemo(() => {
    const q = memberSearchQuery.toLowerCase().trim();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.department?.toLowerCase().includes(q) ||
        m.phone?.includes(q) ||
        m.gmail?.toLowerCase().includes(q) ||
        m.className?.toLowerCase().includes(q)
    );
  }, [members, memberSearchQuery]);

  return (
    <div className="w-full max-w-full space-y-5 animate-in fade-in duration-300 text-slate-100 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 sm:top-24 left-1/2 -translate-x-1/2 z-50 bg-amber-950 border border-amber-500/80 text-amber-200 px-4 py-2.5 rounded-full font-semibold shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm animate-in slide-in-from-top-4 duration-200">
          <Crown className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#02050B] via-[#0A192F] to-[#040A17] p-4 sm:p-7 border border-[#C5A880]/40 shadow-2xl space-y-4 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] sm:text-xs font-bold border border-amber-500/40 uppercase tracking-wider font-cinzel">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Leadership Roles</span>
              </span>
              {isAdmin && (
                <span className="px-2 py-0.5 rounded bg-[#C5A880]/20 text-[#C5A880] text-[10px] font-bold border border-[#C5A880]/40 uppercase font-mono">
                  Admin Control
                </span>
              )}
            </div>

            <h2 className="font-cinzel text-xl sm:text-3xl font-bold text-white tracking-wide">
              Official Leadership Roles
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isAdmin
                ? 'Designate and assign the 6 official leadership office bearers of Declamate’s Society. Tap "Appoint Member" on any role to assign from registered members.'
                : 'Meet the 6 designated leaders guiding Declamate’s Society. View each officer\'s photo, name, contact number, and key role responsibilities below.'}
            </p>
          </div>

          {/* Quick Counter */}
          <div className="flex items-center gap-3 self-start md:self-auto bg-[#030712]/90 border border-[#1E2E48] p-3 rounded-2xl shadow-inner">
            <div className="text-center px-3 border-r border-[#1E2E48]">
              <span className="font-cinzel text-2xl font-bold text-amber-400 block leading-tight">
                {totalAppointedCount} / 6
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                Appointed
              </span>
            </div>
            <div className="text-center px-3">
              <span className="font-cinzel text-2xl font-bold text-[#C5A880] block leading-tight">
                {members.length}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                Total Members
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 6 Leadership Roles Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#C5A880]" />
          <p className="text-xs font-cinzel">Loading Leadership Roles...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {EXECUTIVE_ROLES_LIST.map((roleDef) => {
            const currentHolder = roleHoldersMap[roleDef.id];
            const isAssigned = Boolean(currentHolder);
            const visual = getRoleVisuals(roleDef.id);
            const RoleIcon = visual.icon;

            return (
              <div
                key={roleDef.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-xl ${
                  isAssigned
                    ? 'bg-[#0B1528] border-amber-500/40 hover:border-amber-400'
                    : 'bg-[#060E1A] border-[#1E2E48] hover:border-[#C5A880]/50'
                }`}
              >
                {/* Card Top / Header */}
                <div className="p-4 sm:p-5 border-b border-[#1E2E48]/80 bg-gradient-to-b from-[#081220] to-transparent">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl border flex items-center justify-center shrink-0 ${visual.badgeBg} ${visual.border}`}
                      >
                        <RoleIcon className={`w-5 h-5 ${visual.badgeText}`} />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                          {visual.rank}
                        </span>
                        <h3 className="font-cinzel font-bold text-white text-base sm:text-lg leading-tight">
                          {roleDef.label}
                        </h3>
                      </div>
                    </div>

                    {isAssigned ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold shrink-0">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-medium shrink-0">
                        Vacant
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Middle: Member Photo, Name & Phone Number */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5">
                  {isAssigned && currentHolder ? (
                    <div className="p-3.5 rounded-xl bg-[#030712] border border-[#1E2E48] space-y-3">
                      <div className="flex items-center gap-3.5">
                        {currentHolder.photoUrl ? (
                          <img
                            src={currentHolder.photoUrl}
                            alt={currentHolder.name}
                            className="w-14 h-14 rounded-full object-cover border-2 border-amber-400 shrink-0 shadow-md"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-[#0A192F] border-2 border-amber-400 text-amber-300 flex items-center justify-center font-bold text-lg shrink-0 shadow-md">
                            {currentHolder.name ? currentHolder.name[0].toUpperCase() : 'M'}
                          </div>
                        )}

                        <div className="min-w-0 flex-1 space-y-1">
                          <h4 className="font-cinzel font-bold text-white text-base truncate">
                            {currentHolder.name}
                          </h4>
                          <p className="text-xs text-[#C5A880] truncate font-medium">
                            {currentHolder.department || 'Department'} &bull; {currentHolder.year || 'Member'}
                          </p>
                          {currentHolder.className && (
                            <p className="text-[11px] text-slate-400 truncate">
                              {currentHolder.className}
                            </p>
                          )}

                          {/* Member Phone Number with Direct Call Action */}
                          <div className="pt-0.5">
                            {currentHolder.phone ? (
                              <a
                                href={`tel:${currentHolder.phone}`}
                                className="inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-white font-mono bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 transition-colors"
                                title="Click to call"
                              >
                                <Phone className="w-3.5 h-3.5 text-amber-400" />
                                <span>{currentHolder.phone}</span>
                              </a>
                            ) : (
                              <span className="text-xs text-slate-500 italic">No phone provided</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => isAdmin && setSelectedRoleToAssign(roleDef.id)}
                      className={`p-6 rounded-xl border border-dashed text-center space-y-2 transition-all ${
                        isAdmin
                          ? 'border-[#1E2E48] hover:border-amber-500/60 bg-[#030712]/50 hover:bg-[#030712] cursor-pointer'
                          : 'border-[#1E2E48]/50 bg-[#030712]/30'
                      }`}
                    >
                      <UserX className="w-7 h-7 mx-auto text-slate-500" />
                      <div>
                        <p className="text-xs font-semibold text-slate-300">
                          Role is currently vacant
                        </p>
                        {isAdmin && (
                          <p className="text-[11px] text-amber-400 mt-0.5">
                            + Click to assign a member
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Underneath: Role Work in Simple Clear English Words */}
                  <div className="bg-[#030712]/70 rounded-xl p-3 border border-[#1E2E48]/80 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#C5A880] font-cinzel">
                      <Briefcase className="w-3.5 h-3.5 text-[#C5A880]" />
                      <span>Role Work & Responsibility</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {roleDef.desc}
                    </p>
                  </div>
                </div>

                {/* Card Footer: Admin Actions (Only for Admin) */}
                {isAdmin && (
                  <div className="p-3.5 sm:p-4 bg-[#030712]/90 border-t border-[#1E2E48] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoleToAssign(roleDef.id);
                        setMemberSearchQuery('');
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#0E1E38] hover:bg-[#152B4D] border border-[#1E2E48] hover:border-amber-500/50 text-xs font-semibold text-amber-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                    >
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isAssigned ? 'Change Appointee' : 'Appoint Member'}</span>
                    </button>

                    {isAssigned && (
                      <button
                        type="button"
                        onClick={() => handleVacateRole(roleDef.id)}
                        disabled={isUpdating}
                        className="py-2 px-3 rounded-xl bg-[#030712] hover:bg-rose-950/50 border border-[#1E2E48] hover:border-rose-500/40 text-slate-400 hover:text-rose-300 text-xs font-medium transition-all cursor-pointer active:scale-95"
                        title="Remove member from this role (Make Vacant)"
                      >
                        Vacate
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* APPOINT MEMBER MODAL */}
      {selectedRoleToAssign && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          onClick={() => setSelectedRoleToAssign(null)}
        >
          <div
            className="w-full max-w-lg bg-[#0B1528] border border-amber-500/60 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1E2E48] pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#030712] border border-amber-500/50 text-amber-400">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-cinzel font-bold text-white text-base sm:text-lg">
                    Appoint {selectedRoleToAssign}
                  </h3>
                  <p className="text-[10px] text-amber-300 font-cinzel">
                    Declamate’s Society Executive Committee
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRoleToAssign(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2E48]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Search member by name, department, phone, email..."
                className="w-full bg-[#030712] border border-[#1E2E48] focus:border-amber-400 rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none transition-all"
                autoFocus
              />
            </div>

            {/* Candidates List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
              {filteredCandidates.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No members matched &ldquo;{memberSearchQuery}&rdquo;
                </div>
              ) : (
                filteredCandidates.map((member) => {
                  const isCurrentRoleHolder = member.executiveRole === selectedRoleToAssign;
                  const isAnotherRoleHolder =
                    Boolean(member.executiveRole) && member.executiveRole !== selectedRoleToAssign;

                  return (
                    <div
                      key={member.id || member.gmail}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        isCurrentRoleHolder
                          ? 'bg-amber-950/40 border-amber-500/60'
                          : 'bg-[#030712] border-[#1E2E48] hover:border-[#C5A880]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {member.photoUrl ? (
                          <img
                            src={member.photoUrl}
                            alt={member.name}
                            className="w-10 h-10 rounded-full object-cover border border-[#C5A880] shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#0A192F] border border-[#C5A880] text-[#C5A880] flex items-center justify-center font-bold text-xs shrink-0">
                            {member.name ? member.name[0].toUpperCase() : 'M'}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-semibold text-white text-xs sm:text-sm truncate">
                              {member.name}
                            </h4>
                            {isCurrentRoleHolder && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold">
                                Current Appointee
                              </span>
                            )}
                            {isAnotherRoleHolder && (
                              <span className="px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-500/40 text-[9px]">
                                Already: {member.executiveRole}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {member.department} &bull; {member.year} &bull; {member.gmail}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAppoint(selectedRoleToAssign, member)}
                        disabled={isUpdating || isCurrentRoleHolder}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-all ${
                          isCurrentRoleHolder
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold active:scale-95 shadow-md'
                        }`}
                      >
                        {isCurrentRoleHolder ? 'Selected' : 'Appoint'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-[#1E2E48] flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedRoleToAssign(null)}
                className="px-4 py-2 rounded-xl bg-[#030712] border border-[#1E2E48] text-slate-300 hover:text-white text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEMBER DOSSIER VIEW MODAL */}
      {selectedMemberModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          onClick={() => setSelectedMemberModal(null)}
        >
          <div
            className="w-full max-w-md bg-[#0B1528] border border-amber-500/60 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#1E2E48] pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <h3 className="font-cinzel font-bold text-white text-base">Executive Officer Dossier</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMemberModal(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              {selectedMemberModal.photoUrl ? (
                <img
                  src={selectedMemberModal.photoUrl}
                  alt={selectedMemberModal.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#0A192F] border-2 border-amber-400 text-amber-300 flex items-center justify-center font-bold text-xl shrink-0">
                  {selectedMemberModal.name ? selectedMemberModal.name[0].toUpperCase() : 'M'}
                </div>
              )}
              <div className="min-w-0">
                <h4 className="font-cinzel font-bold text-white text-lg truncate">
                  {selectedMemberModal.name}
                </h4>
                <p className="text-xs text-amber-300 font-semibold font-cinzel">
                  {selectedMemberModal.executiveRole || 'Executive Member'}
                </p>
                <p className="text-xs text-slate-400">
                  {selectedMemberModal.department} &bull; {selectedMemberModal.year}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#030712] border border-[#1E2E48] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Email:</span>
                <a
                  href={`mailto:${selectedMemberModal.gmail}`}
                  className="text-amber-300 hover:underline font-mono truncate max-w-[200px]"
                >
                  {selectedMemberModal.gmail}
                </a>
              </div>
              {selectedMemberModal.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <a
                    href={`tel:${selectedMemberModal.phone}`}
                    className="text-slate-200 hover:underline font-mono"
                  >
                    {selectedMemberModal.phone}
                  </a>
                </div>
              )}
              {selectedMemberModal.className && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Class:</span>
                  <span className="text-slate-200">{selectedMemberModal.className}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedMemberModal(null)}
              className="w-full py-2.5 rounded-xl bg-[#030712] hover:bg-[#112240] border border-[#1E2E48] text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Close Dossier
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
