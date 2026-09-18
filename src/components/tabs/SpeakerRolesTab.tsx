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
  Filter,
  Timer,
  UserCheck,
} from 'lucide-react';
import { UserProfile, RegisteredMember, SPEAKER_ROLES_LIST, formatSpeakerRole, isUserAdmin, isUserRoleEntry } from '../../types';
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
        colorHex: '#D1B079',
      };
    case 'Role Players':
    case 'Best Role Players':
      return {
        icon: Award,
        badgeBg: 'bg-emerald-950/60',
        badgeText: 'text-emerald-300',
        border: 'border-emerald-500/40',
        colorHex: '#D1B079',
      };
    case 'Evaluators':
    case 'Best Evaluators':
    case 'Evaluators (Feedbacker)':
    case 'Feedbacker':
      return {
        icon: FileCheck,
        badgeBg: 'bg-sky-950/60',
        badgeText: 'text-sky-300',
        border: 'border-sky-500/40',
        colorHex: '#D1B079',
      };
    case 'Quick Think Speaker':
    case 'Best Quick Think Speaker':
      return {
        icon: Zap,
        badgeBg: 'bg-purple-950/60',
        badgeText: 'text-purple-300',
        border: 'border-purple-500/40',
        colorHex: '#D1B079',
      };
    case 'Filter Counter':
      return {
        icon: Filter,
        badgeBg: 'bg-teal-950/60',
        badgeText: 'text-teal-300',
        border: 'border-teal-500/40',
        colorHex: '#D1B079',
      };
    case 'Time Steward':
      return {
        icon: Timer,
        badgeBg: 'bg-orange-950/60',
        badgeText: 'text-orange-300',
        border: 'border-orange-500/40',
        colorHex: '#D1B079',
      };
    default:
      return {
        icon: Mic,
        badgeBg: 'bg-slate-900',
        badgeText: 'text-slate-300',
        border: 'border-slate-700',
        colorHex: '#BFA373',
      };
  }
};

export const SpeakerRolesTab: React.FC<SpeakerRolesTabProps> = ({ userProfile, onUpdateProfile }) => {
  const [members, setMembers] = useState<RegisteredMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRoleToAssign, setSelectedRoleToAssign] = useState<string | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedMemberModal, setSelectedMemberModal] = useState<RegisteredMember | null>(null);

  const isAdmin = isUserAdmin(userProfile);
  const isRoleEntry = isUserRoleEntry(userProfile);
  const canManageRoles = isAdmin || isRoleEntry;

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

  const normalizeRoleName = (r: string): string => {
    const trimmed = r.trim();
    if (trimmed === 'Best Role Players' || trimmed === 'Role Players') return 'Role Players';
    if (
      trimmed === 'Best Evaluators' ||
      trimmed === 'Evaluators' ||
      trimmed === 'Evaluator' ||
      trimmed === 'Evaluators (Feedbacker)' ||
      trimmed === 'Evaluator (Feedbacker)' ||
      trimmed === 'Feedbacker'
    ) return 'Evaluators';
    if (trimmed === 'Best Quick Think Speaker' || trimmed === 'Quick Think Speaker') return 'Quick Think Speaker';
    return trimmed;
  };

  const isMemberInSpeakerRole = (member: RegisteredMember, roleName: string): boolean => {
    const target = normalizeRoleName(roleName);
    return getMemberAssignedSpeakerRoles(member).some(
      (r) => normalizeRoleName(r) === target
    );
  };

  const speakerRoleMembersMap = useMemo(() => {
    const map: Record<string, RegisteredMember[]> = {
      'Key Note Speakers': [],
      'Role Players': [],
      'Evaluators': [],
      'Quick Think Speaker': [],
      'Filter Counter': [],
      'Time Steward': [],
    };

    members.forEach((m) => {
      SPEAKER_ROLES_LIST.forEach((r) => {
        if (isMemberInSpeakerRole(m, r.id)) {
          if (!map[r.id]) {
            map[r.id] = [];
          }
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
    if (!canManageRoles) {
      showToast('Permission required.');
      return;
    }

    if (!member.id) return;

    // Strict Rule: A member appointed in one speaker role cannot be appointed in another role
    const currentRoles = getMemberAssignedSpeakerRoles(member);
    const conflictingRoles = currentRoles.filter(
      (r) => normalizeRoleName(r) !== normalizeRoleName(roleName)
    );
    if (conflictingRoles.length > 0) {
      showToast(`Cannot appoint: ${member.name} is already appointed as "${conflictingRoles.join(', ')}". Each member can hold only 1 speaker role.`);
      return;
    }

    // Role Capacity Check: Filter Counter and Time Steward can only have 1 member
    const roleDef = SPEAKER_ROLES_LIST.find((r) => r.id === roleName);
    const isSingleMemberRole = roleDef?.maxMembers === 1;
    const currentOccupants = speakerRoleMembersMap[roleName] || [];

    let previousOccupant: RegisteredMember | null = null;
    if (isSingleMemberRole && currentOccupants.length >= 1) {
      const alreadyAssigned = currentOccupants.some((m) => m.id === member.id);
      if (alreadyAssigned) {
        showToast(`${member.name} is already appointed to ${roleName}`);
        return;
      }
      // Single-member role: replace previous occupant
      previousOccupant = currentOccupants[0];
    }

    setIsUpdating(true);

    // If single-member role had an existing occupant, remove them first
    if (previousOccupant && previousOccupant.id) {
      await removeSpeakerRoleFromMember(previousOccupant.id, roleName);
      setMembers((prev) =>
        prev.map((m) => {
          if (m.id === previousOccupant!.id) {
            const prevRoles = Array.isArray(m.speakerRoles) ? m.speakerRoles : [];
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
    }

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
      (userProfile.gmail && member.gmail && userProfile.gmail.toLowerCase().trim() === member.gmail.toLowerCase().trim()) ||
      (userProfile.phone && member.phone && userProfile.phone.trim() === member.phone.trim()) ||
      (userProfile.name && member.name && userProfile.name.toLowerCase().trim() === member.name.toLowerCase().trim())
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
      const cleanRole = formatSpeakerRole(roleName);
      const isFeedbackerRole =
        roleName === 'Evaluators' ||
        cleanRole.toLowerCase().includes('evaluator') ||
        cleanRole.toLowerCase().includes('feedbacker');

      const isTimeStewardRole =
        roleName === 'Time Steward' ||
        cleanRole.toLowerCase().includes('time steward');

      const isFillerCounterRole =
        roleName === 'Filter Counter' ||
        roleName === 'Filler Counter' ||
        cleanRole.toLowerCase().includes('filler') ||
        cleanRole.toLowerCase().includes('filter');

      if (isFeedbackerRole) {
        showToast(`Appointed ${member.name} as Feedbacker • Speech Evaluator Page unlocked with NEW badge in sidebar!`);
      } else if (isTimeStewardRole) {
        showToast(`Appointed ${member.name} as Time Steward • Time Steward Page unlocked with NEW badge in sidebar!`);
      } else if (isFillerCounterRole) {
        showToast(`Appointed ${member.name} as Filler Counter • Filler Counter Page unlocked with NEW badge in sidebar!`);
      } else if (previousOccupant) {
        showToast(`Appointed ${member.name} as ${cleanRole} (Replaced ${previousOccupant.name} • 1 Member limit)`);
      } else {
        showToast(`Added ${member.name} to ${cleanRole}`);
      }

      // Send personal appointment notification message in simple English
      if (member.gmail) {
        const messageTitle = isFeedbackerRole
          ? 'Evaluator (Feedbacker) Appointed!'
          : isTimeStewardRole
          ? 'Time Steward Appointed!'
          : isFillerCounterRole
          ? 'Filler Counter Appointed!'
          : `${cleanRole} Appointed!`;

        const messageBody = isFeedbackerRole
          ? `You have been appointed as Evaluator (Feedbacker). The Speech Evaluator Page is now unlocked with a NEW badge in your sidebar!`
          : isTimeStewardRole
          ? `You have been appointed as Time Steward. The Time Steward Page is now unlocked with a NEW badge in your sidebar!`
          : isFillerCounterRole
          ? `You have been appointed as Filler Counter. The Filler Counter Page is now unlocked with a NEW badge in your sidebar!`
          : `You have been appointed as ${cleanRole}. Congratulations and give your best!`;

        sendAppMessage({
          type: 'role_appointed',
          title: messageTitle,
          message: messageBody,
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
    if (!canManageRoles) {
      showToast('Permission required.');
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
      (userProfile.gmail && member.gmail && userProfile.gmail.toLowerCase().trim() === member.gmail.toLowerCase().trim()) ||
      (userProfile.phone && member.phone && userProfile.phone.trim() === member.phone.trim()) ||
      (userProfile.name && member.name && userProfile.name.toLowerCase().trim() === member.name.toLowerCase().trim())
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
      const cleanRole = formatSpeakerRole(roleName);
      showToast(`Removed ${member.name} from ${cleanRole}`);
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

  const visibleSpeakerRoles = SPEAKER_ROLES_LIST;

  return (
    <div className="w-full max-w-full space-y-5 animate-in fade-in duration-300 text-slate-100 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-50 bg-[#06111F] border border-amber-500/80 text-amber-200 px-4 py-2 rounded-full font-medium shadow-2xl flex items-center gap-2 text-xs sm:text-sm animate-in slide-in-from-top-3 duration-150">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="rounded-2xl bg-[#06111F] p-4 sm:p-5 border border-[#BFA373]/30 shadow-lg">
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-amber-400" />
          <h2 className="font-cinzel text-xl sm:text-2xl font-bold text-white tracking-wide">
            Speaker Roles
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {canManageRoles ? 'Manage appointed members for each role.' : 'Current appointed members.'}
        </p>
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
                className="rounded-2xl border border-[#BFA373]/30 bg-[#06111F] shadow-md overflow-hidden"
              >
                {/* Header Strip */}
                <div className="p-3.5 sm:p-4 border-b border-[#BFA373]/30 bg-[#06111F] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-xl border flex items-center justify-center shrink-0 ${visual.badgeBg} ${visual.border}`}
                    >
                      <RoleIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${visual.badgeText}`} />
                    </div>

                    <h3 className="font-cinzel font-bold text-white text-sm sm:text-base">
                      {roleDef.label}
                    </h3>
                  </div>

                  {/* Add Member Button (Admin & Role Entry) */}
                  {canManageRoles && (
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
                {appointedList.length > 0 && (
                  <div className="p-3 sm:p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                      {appointedList.map((member, mIdx) => (
                        <div
                          key={member.id || member.gmail}
                          className="p-3 rounded-xl bg-[#06111F] border border-[#BFA373]/30 hover:border-slate-600 transition-all flex items-center justify-between gap-2.5"
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
                              <div className="w-9 h-9 rounded-full bg-[#06111F] border border-amber-400/60 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
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

                          {/* Admin & Role Entry Remove */}
                          {canManageRoles && (
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
                  </div>
                )}
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
            className="w-full max-w-lg bg-[#06111F] border border-amber-500/50 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150 text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#BFA373]/30 pb-3 shrink-0">
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
                className="w-full bg-[#06111F] border border-[#BFA373]/30 focus:border-amber-400 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none"
                autoFocus
              />
            </div>

            {/* Rule Notice */}
            {selectedRoleToAssign && (
              (() => {
                const targetDef = SPEAKER_ROLES_LIST.find((r) => r.id === selectedRoleToAssign);
                const isSingle = targetDef?.maxMembers === 1;
                const occupantCount = speakerRoleMembersMap[selectedRoleToAssign]?.length || 0;

                return isSingle ? (
                  <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-200 text-xs flex items-center gap-2 shrink-0">
                    <UserCheck className="w-4 h-4 text-teal-400 shrink-0" />
                    <span className="leading-snug">
                      <strong>Single-Member Role (1 Member Only):</strong> {selectedRoleToAssign} can only have 1 member. {occupantCount >= 1 ? 'Adding a new member will replace the current occupant.' : '1 slot available.'}
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2 shrink-0">
                    <Users className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="leading-snug">
                      <strong>Multi-Member Role:</strong> Multiple members can be appointed to {selectedRoleToAssign} (No limit).
                    </span>
                  </div>
                );
              })()
            )}

            {/* Candidate List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[200px]">
              {filteredCandidates.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No members found
                </div>
              ) : (
                filteredCandidates.map((member) => {
                  const assignedRoles = getMemberAssignedSpeakerRoles(member);
                  const isAlreadyAppointed = assignedRoles.some(
                    (r) => normalizeRoleName(r) === normalizeRoleName(selectedRoleToAssign)
                  );
                  const otherRoles = assignedRoles.filter(
                    (r) => normalizeRoleName(r) !== normalizeRoleName(selectedRoleToAssign)
                  );
                  const isAssignedToOtherRole = otherRoles.length > 0;
                  const targetDef = SPEAKER_ROLES_LIST.find((r) => r.id === selectedRoleToAssign);
                  const isSingle = targetDef?.maxMembers === 1;
                  const occupantCount = speakerRoleMembersMap[selectedRoleToAssign]?.length || 0;

                  return (
                    <div
                      key={member.id || member.gmail}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all ${
                        isAlreadyAppointed
                          ? 'bg-amber-950/25 border-amber-500/50'
                          : isAssignedToOtherRole
                          ? 'bg-[#06111F]/50 border-[#BFA373]/30/50 opacity-60'
                          : 'bg-[#06111F] border-[#BFA373]/30 hover:border-slate-600'
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
                          <div className="w-8 h-8 rounded-full bg-[#06111F] border border-amber-400/50 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
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
                          className="px-2.5 py-1 rounded-lg bg-[#06111F]/60 border border-slate-700/60 text-slate-500 text-xs font-medium shrink-0 cursor-not-allowed"
                          title={`Cannot appoint: ${member.name} is already appointed to "${otherRoles.join(', ')}"`}
                        >
                          Occupied
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddMemberToSpeakerRole(selectedRoleToAssign, member)}
                          disabled={isUpdating}
                          className={`px-2.5 py-1 rounded-lg font-bold text-xs shrink-0 cursor-pointer transition-all active:scale-95 ${
                            isSingle && occupantCount >= 1
                              ? 'bg-teal-500 hover:bg-teal-400 text-slate-950'
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          }`}
                        >
                          {isSingle && occupantCount >= 1 ? 'Replace' : 'Add'}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-[#BFA373]/30 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedRoleToAssign(null)}
                className="px-4 py-1.5 rounded-xl bg-[#06111F] hover:bg-[#06111F] border border-[#BFA373]/30 text-slate-300 text-xs font-medium cursor-pointer"
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
            className="w-full max-w-sm bg-[#06111F] border border-amber-500/50 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xl animate-in zoom-in-95 duration-150 text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#BFA373]/30 pb-2.5">
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
                <div className="w-12 h-12 rounded-full bg-[#06111F] border border-amber-400 text-amber-300 flex items-center justify-center font-bold text-base shrink-0">
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

            <div className="p-3 rounded-xl bg-[#06111F] border border-[#BFA373]/30 space-y-1.5 text-xs">
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
              className="w-full py-2 rounded-xl bg-[#06111F] hover:bg-[#06111F] border border-[#BFA373]/30 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
