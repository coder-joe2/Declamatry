import React, { useState, useEffect, useMemo } from 'react';
import {
  Mic,
  Award,
  Zap,
  CheckCircle2,
  Search,
  Mail,
  Phone,
  RefreshCw,
  UserX,
  ChevronRight,
  UserPlus,
  UserMinus,
  X,
  FileCheck,
  Users,
  Info,
} from 'lucide-react';
import { UserProfile, RegisteredMember, SPEAKER_ROLES_LIST, formatSpeakerRole } from '../../types';
import {
  subscribeToRegisteredMembers,
  addSpeakerRoleToMember,
  removeSpeakerRoleFromMember,
  sendAppMessage,
} from '../../firebase';

interface SpeakerRolesTabProps {
  userProfile: UserProfile;
  onUpdateProfile?: (updated: UserProfile) => void;
}

const getSpeakerRoleVisuals = (role: string) => {
  switch (role) {
    case 'Key Note Speakers':
      return {
        icon: Mic,
        badgeBg: 'bg-amber-950/60',
        badgeText: 'text-amber-300',
        border: 'border-amber-500/40',
        colorHex: '#F59E0B',
      };
    case 'Best Role Players':
      return {
        icon: Award,
        badgeBg: 'bg-emerald-950/60',
        badgeText: 'text-emerald-300',
        border: 'border-emerald-500/40',
        colorHex: '#10B981',
      };
    case 'Best Evaluators':
      return {
        icon: FileCheck,
        badgeBg: 'bg-sky-950/60',
        badgeText: 'text-sky-300',
        border: 'border-sky-500/40',
        colorHex: '#0EA5E9',
      };
    case 'Best Quick Think Speaker':
      return {
        icon: Zap,
        badgeBg: 'bg-purple-950/60',
        badgeText: 'text-purple-300',
        border: 'border-purple-500/40',
        colorHex: '#A855F7',
      };
    default:
      return {
        icon: Mic,
        badgeBg: 'bg-slate-900',
        badgeText: 'text-slate-300',
        border: 'border-slate-700',
        colorHex: '#C5A880',
      };
  }
};

export const SpeakerRolesTab: React.FC<SpeakerRolesTabProps> = ({ userProfile, onUpdateProfile }) => {
  const [members, setMembers] = useState<RegisteredMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRoleToAssign, setSelectedRoleToAssign] = useState<string | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');
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
    }, 3000);
  };

  const getMemberAssignedSpeakerRoles = (member: RegisteredMember): string[] => {
    if (member.speakerRoles && Array.isArray(member.speakerRoles)) {
      return member.speakerRoles.filter(Boolean);
    }
    if (member.speakerRole && typeof member.speakerRole === 'string') {
      return member.speakerRole.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };

  const isMemberInSpeakerRole = (member: RegisteredMember, roleName: string): boolean => {
    return getMemberAssignedSpeakerRoles(member).includes(roleName);
  };

  const speakerRoleMembersMap = useMemo(() => {
    const map: Record<string, RegisteredMember[]> = {
      'Key Note Speakers': [],
      'Best Role Players': [],
      'Best Evaluators': [],
      'Best Quick Think Speaker': [],
    };

    members.forEach((m) => {
      SPEAKER_ROLES_LIST.forEach((r) => {
        if (isMemberInSpeakerRole(m, r.id)) {
          map[r.id].push(m);
        }
      });
    });

    return map;
  }, [members]);

  const totalAppointedCount = useMemo(() => {
    let total = 0;
    Object.values(speakerRoleMembersMap).forEach((list: RegisteredMember[]) => {
      total += list.length;
    });
    return total;
  }, [speakerRoleMembersMap]);

  const handleAddMemberToSpeakerRole = async (roleName: string, member: RegisteredMember) => {
    if (!isAdmin) {
      showToast('Admin privilege required.');
      return;
    }

    if (!member.id) return;

    // Strict Rule: A member appointed in one speaker role cannot be appointed in another role
    const currentRoles = getMemberAssignedSpeakerRoles(member);
    const conflictingRoles = currentRoles.filter((r) => r !== roleName);
    if (conflictingRoles.length > 0) {
      showToast(`Cannot appoint: ${member.name} is already appointed as "${conflictingRoles.join(', ')}". Each member can hold only 1 speaker role.`);
      return;
    }

    setIsUpdating(true);

    // Optimistic UI update
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === member.id) {
          return {
            ...m,
            speakerRoles: [roleName],
            speakerRole: roleName,
          };
        }
        return m;
      })
    );

    // If appointed member is the currently logged-in user, sync active profile immediately
    const isCurrentActiveUser = Boolean(
      (userProfile.id && member.id === userProfile.id) ||
      (userProfile.gmail && member.gmail && userProfile.gmail.toLowerCase() === member.gmail.toLowerCase()) ||
      (userProfile.phone && member.phone && userProfile.phone === member.phone)
    );
    if (isCurrentActiveUser && onUpdateProfile) {
      onUpdateProfile({
        ...userProfile,
        speakerRoles: [roleName],
        speakerRole: roleName,
      });
    }

    const res = await addSpeakerRoleToMember(member.id, roleName);
    setIsUpdating(false);

    if (res.success) {
      showToast(`Added ${member.name} to ${roleName}`);

      // Send personal appointment notification message in simple English
      if (member.gmail) {
        const cleanRole = formatSpeakerRole(roleName);
        sendAppMessage({
          type: 'role_appointed',
          title: `${cleanRole} Appointed!`,
          message: `You have been appointed as ${cleanRole}. Congratulations and give your best!`,
          targetEmail: member.gmail.trim().toLowerCase(),
          roleName: cleanRole,
          createdAt: new Date().toISOString(),
          createdBy: {
            name: userProfile.name || 'Admin',
            gmail: userProfile.gmail || '',
          },
          readBy: [],
        }).catch((err) => console.warn('Failed to send appointment message:', err));
      }
    } else {
      showToast(`Failed: ${res.error || 'Please try again'}`);
    }
  };

  const handleRemoveMemberFromSpeakerRole = async (roleName: string, member: RegisteredMember) => {
    if (!isAdmin) {
      showToast('Admin privilege required.');
      return;
    }

    if (!member.id) return;

    setIsUpdating(true);

    // Optimistic UI update
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === member.id) {
          const prevRoles = Array.isArray(m.speakerRoles)
            ? m.speakerRoles
            : m.speakerRole
            ? m.speakerRole.split(',').map((s) => s.trim()).filter(Boolean)
            : [];
          const nextRoles = prevRoles.filter((r) => r !== roleName);
          return {
            ...m,
            speakerRoles: nextRoles,
            speakerRole: nextRoles.length > 0 ? nextRoles.join(', ') : '',
          };
        }
        return m;
      })
    );

    // If removed member is the currently logged-in user, sync active profile immediately
    const isCurrentActiveUser = Boolean(
      (userProfile.id && member.id === userProfile.id) ||
      (userProfile.gmail && member.gmail && userProfile.gmail.toLowerCase() === member.gmail.toLowerCase()) ||
      (userProfile.phone && member.phone && userProfile.phone === member.phone)
    );
    if (isCurrentActiveUser && onUpdateProfile) {
      const prevRoles = Array.isArray(userProfile.speakerRoles)
        ? userProfile.speakerRoles
        : userProfile.speakerRole
        ? userProfile.speakerRole.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const nextRoles = prevRoles.filter((r) => r !== roleName);
      onUpdateProfile({
        ...userProfile,
        speakerRoles: nextRoles,
        speakerRole: nextRoles.length > 0 ? nextRoles.join(', ') : '',
      });
    }

    const res = await removeSpeakerRoleFromMember(member.id, roleName);
    setIsUpdating(false);

    if (res.success) {
      showToast(`Removed ${member.name}`);
    } else {
      showToast(`Failed: ${res.error}`);
    }
  };

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

  const visibleSpeakerRoles = useMemo(() => {
    if (activeCategoryFilter === 'ALL') return SPEAKER_ROLES_LIST;
    return SPEAKER_ROLES_LIST.filter((r) => r.id === activeCategoryFilter);
  }, [activeCategoryFilter]);

  return (
    <div className="w-full max-w-full space-y-5 animate-in fade-in duration-300 text-slate-100 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-50 bg-[#0E1E38] border border-amber-500/80 text-amber-200 px-4 py-2 rounded-full font-medium shadow-2xl flex items-center gap-2 text-xs sm:text-sm animate-in slide-in-from-top-3 duration-150">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="rounded-2xl bg-[#081220] p-4 sm:p-5 border border-[#1E2E48] shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-amber-400" />
            <h2 className="font-cinzel text-xl sm:text-2xl font-bold text-white tracking-wide">
              Speaker Roles
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin ? 'Manage appointed members for each role.' : 'Current appointed members.'}
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveCategoryFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 cursor-pointer text-xs ${
              activeCategoryFilter === 'ALL'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-[#030712] border border-[#1E2E48] text-slate-300 hover:text-white'
            }`}
          >
            All ({totalAppointedCount})
          </button>
          {SPEAKER_ROLES_LIST.map((r) => {
            const count = speakerRoleMembersMap[r.id]?.length || 0;
            const visual = getSpeakerRoleVisuals(r.id);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveCategoryFilter(r.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 cursor-pointer text-xs flex items-center gap-1.5 ${
                  activeCategoryFilter === r.id
                    ? `${visual.badgeBg} ${visual.border} ${visual.badgeText} font-bold border`
                    : 'bg-[#030712] border border-[#1E2E48] text-slate-300 hover:text-white'
                }`}
              >
                <span>{r.label}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px]">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Speaker Roles List */}
      {isLoading ? (
        <div className="p-10 text-center text-slate-400 space-y-2">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-400" />
          <p className="text-xs">Loading...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleSpeakerRoles.map((roleDef) => {
            const appointedList = speakerRoleMembersMap[roleDef.id] || [];
            const count = appointedList.length;
            const visual = getSpeakerRoleVisuals(roleDef.id);
            const RoleIcon = visual.icon;

            return (
              <div
                key={roleDef.id}
                className="rounded-2xl border border-[#1E2E48] bg-[#070F1E] shadow-md overflow-hidden"
              >
                {/* Header Strip */}
                <div className="p-3.5 sm:p-4 border-b border-[#1E2E48] bg-[#09152A] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-xl border flex items-center justify-center shrink-0 ${visual.badgeBg} ${visual.border}`}
                    >
                      <RoleIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${visual.badgeText}`} />
                    </div>

                    <div>
                      <h3 className="font-cinzel font-bold text-white text-sm sm:text-base">
                        {roleDef.label}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {count} {count === 1 ? 'member' : 'members'}
                      </p>
                    </div>
                  </div>

                  {/* Add Member Button (Admin) */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoleToAssign(roleDef.id);
                        setMemberSearchQuery('');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Add Member</span>
                    </button>
                  )}
                </div>

                {/* Appointed Members */}
                <div className="p-3 sm:p-4">
                  {appointedList.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-[#1E2E48] bg-[#030712]/40 text-center space-y-1">
                      <p className="text-xs text-slate-400">No members added yet</p>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRoleToAssign(roleDef.id);
                            setMemberSearchQuery('');
                          }}
                          className="text-xs text-amber-400 hover:underline font-medium cursor-pointer"
                        >
                          + Add Member
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                      {appointedList.map((member, mIdx) => (
                        <div
                          key={member.id || member.gmail}
                          className="p-3 rounded-xl bg-[#030712] border border-[#1E2E48] hover:border-slate-600 transition-all flex items-center justify-between gap-2.5"
                        >
                          <div
                            onClick={() => setSelectedMemberModal(member)}
                            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                          >
                            {/* Avatar */}
                            {member.photoUrl ? (
                              <img
                                src={member.photoUrl}
                                alt={member.name}
                                className="w-9 h-9 rounded-full object-cover border border-amber-400/60 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-[#0A192F] border border-amber-400/60 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                                {member.name ? member.name[0].toUpperCase() : 'M'}
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-white text-xs truncate">
                                {member.name}
                              </h4>
                              <p className="text-[11px] text-slate-400 truncate">
                                {member.department || 'Member'} {member.year ? `• ${member.year}` : ''}
                              </p>
                            </div>
                          </div>

                          {/* Admin Remove */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMemberFromSpeakerRole(roleDef.id, member)}
                              disabled={isUpdating}
                              className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-all shrink-0 cursor-pointer"
                              title="Remove member"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD MEMBER MODAL */}
      {selectedRoleToAssign && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setSelectedRoleToAssign(null)}
        >
          <div
            className="w-full max-w-lg bg-[#0B1528] border border-amber-500/50 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150 text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1E2E48] pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-amber-400" />
                <h3 className="font-cinzel font-bold text-white text-base">
                  Add to {selectedRoleToAssign}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRoleToAssign(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
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
                placeholder="Search by name, department, phone, email..."
                className="w-full bg-[#030712] border border-[#1E2E48] focus:border-amber-400 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none"
                autoFocus
              />
            </div>

            {/* Rule Notice */}
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2 shrink-0">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="leading-snug">
                <strong>Rule:</strong> Each member can only be appointed to <strong>one</strong> speaker role. Members already in another role cannot be appointed here.
              </span>
            </div>

            {/* Candidate List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[200px]">
              {filteredCandidates.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No members found
                </div>
              ) : (
                filteredCandidates.map((member) => {
                  const assignedRoles = getMemberAssignedSpeakerRoles(member);
                  const isAlreadyAppointed = assignedRoles.includes(selectedRoleToAssign);
                  const otherRoles = assignedRoles.filter((r) => r !== selectedRoleToAssign);
                  const isAssignedToOtherRole = otherRoles.length > 0;

                  return (
                    <div
                      key={member.id || member.gmail}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all ${
                        isAlreadyAppointed
                          ? 'bg-amber-950/25 border-amber-500/50'
                          : isAssignedToOtherRole
                          ? 'bg-[#030712]/50 border-[#1E2E48]/50 opacity-60'
                          : 'bg-[#030712] border-[#1E2E48] hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {member.photoUrl ? (
                          <img
                            src={member.photoUrl}
                            alt={member.name}
                            className="w-8 h-8 rounded-full object-cover border border-amber-400/50 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#0A192F] border border-amber-400/50 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                            {member.name ? member.name[0].toUpperCase() : 'M'}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-semibold text-white text-xs truncate">
                              {member.name}
                            </h4>
                            {isAlreadyAppointed && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                Current
                              </span>
                            )}
                            {isAssignedToOtherRole && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-950/60 text-rose-300 border border-rose-500/40 truncate max-w-[170px]"
                                title={`Already appointed to ${otherRoles.join(', ')}`}
                              >
                                In {otherRoles[0]}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {member.department} {member.year ? `• ${member.year}` : ''} • {member.gmail}
                          </p>
                        </div>
                      </div>

                      {isAlreadyAppointed ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveMemberFromSpeakerRole(selectedRoleToAssign, member)}
                          disabled={isUpdating}
                          className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-950 border border-rose-500/40 text-rose-300 text-xs font-medium shrink-0 cursor-pointer transition-colors"
                        >
                          Remove
                        </button>
                      ) : isAssignedToOtherRole ? (
                        <button
                          type="button"
                          disabled
                          className="px-2.5 py-1 rounded-lg bg-[#0E1E38]/60 border border-slate-700/60 text-slate-500 text-xs font-medium shrink-0 cursor-not-allowed"
                          title={`Cannot appoint: ${member.name} is already appointed to "${otherRoles.join(', ')}"`}
                        >
                          Occupied
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddMemberToSpeakerRole(selectedRoleToAssign, member)}
                          disabled={isUpdating}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer transition-all active:scale-95"
                        >
                          Add
                        </button>
                      )}
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
                className="px-4 py-1.5 rounded-xl bg-[#030712] hover:bg-[#112240] border border-[#1E2E48] text-slate-300 text-xs font-medium cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEMBER DOSSIER MODAL */}
      {selectedMemberModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setSelectedMemberModal(null)}
        >
          <div
            className="w-full max-w-sm bg-[#0B1528] border border-amber-500/50 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xl animate-in zoom-in-95 duration-150 text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#1E2E48] pb-2.5">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-amber-400" />
                <h3 className="font-cinzel font-bold text-white text-sm">Member Info</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMemberModal(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {selectedMemberModal.photoUrl ? (
                <img
                  src={selectedMemberModal.photoUrl}
                  alt={selectedMemberModal.name}
                  className="w-12 h-12 rounded-full object-cover border border-amber-400 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#0A192F] border border-amber-400 text-amber-300 flex items-center justify-center font-bold text-base shrink-0">
                  {selectedMemberModal.name ? selectedMemberModal.name[0].toUpperCase() : 'M'}
                </div>
              )}
              <div className="min-w-0">
                <h4 className="font-cinzel font-bold text-white text-base truncate">
                  {selectedMemberModal.name}
                </h4>
                <p className="text-xs text-slate-400">
                  {selectedMemberModal.department} {selectedMemberModal.year ? `• ${selectedMemberModal.year}` : ''}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#030712] border border-[#1E2E48] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="text-amber-300 truncate max-w-[180px] font-mono">
                  {selectedMemberModal.gmail}
                </span>
              </div>
              {selectedMemberModal.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <span className="text-slate-200 font-mono">{selectedMemberModal.phone}</span>
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
              className="w-full py-2 rounded-xl bg-[#030712] hover:bg-[#112240] border border-[#1E2E48] text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
