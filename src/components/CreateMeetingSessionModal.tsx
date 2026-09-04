import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  Trophy, 
  Mic, 
  FileText, 
  Zap, 
  Plus, 
  Trash2, 
  Users, 
  UserCheck, 
  UserPlus,
  Calendar,
  Layers,
  Search,
  Check,
  Edit3,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { UserProfile, MeetingVotingSession, MeetingVotingCategory, MeetingCandidate, RegisteredMember } from '../types';
import { fetchAllRegisteredMembers } from '../firebase';

interface CreateMeetingSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSession: (session: Omit<MeetingVotingSession, 'id'>) => Promise<void>;
  userProfile: UserProfile;
}

interface CandidateFormState {
  id: string;
  memberId?: string;
  name: string;
  roleOrTopic?: string;
  photoUrl?: string;
  gmail?: string;
  department?: string;
  year?: string;
  isCustomManual?: boolean;
}

interface CategoryFormState {
  id: string;
  title: string;
  subtitle: string;
  iconName: string;
  candidates: CandidateFormState[];
}

const DEFAULT_CATEGORIES: CategoryFormState[] = [
  {
    id: 'role_players',
    title: '1. Best Role Players',
    subtitle: '',
    iconName: 'trophy',
    candidates: [
      { id: 'rp_1', name: '', roleOrTopic: '' },
      { id: 'rp_2', name: '', roleOrTopic: '' },
      { id: 'rp_3', name: '', roleOrTopic: '' },
      { id: 'rp_4', name: '', roleOrTopic: '' },
    ],
  },
  {
    id: 'keynote_speakers',
    title: '2. Best Key Note Speakers',
    subtitle: '',
    iconName: 'mic',
    candidates: [
      { id: 'sp_1', name: '', roleOrTopic: '' },
      { id: 'sp_2', name: '', roleOrTopic: '' },
      { id: 'sp_3', name: '', roleOrTopic: '' },
      { id: 'sp_4', name: '', roleOrTopic: '' },
      { id: 'sp_5', name: '', roleOrTopic: '' },
    ],
  },
  {
    id: 'evaluators',
    title: '3. Best Evaluators',
    subtitle: '',
    iconName: 'file-text',
    candidates: [
      { id: 'ev_1', name: '', roleOrTopic: '' },
      { id: 'ev_2', name: '', roleOrTopic: '' },
      { id: 'ev_3', name: '', roleOrTopic: '' },
    ],
  },
  {
    id: 'quick_think',
    title: '4. Best Quick Think Speaker',
    subtitle: '',
    iconName: 'zap',
    candidates: [
      { id: 'qt_1', name: '', roleOrTopic: '' },
      { id: 'qt_2', name: '', roleOrTopic: '' },
      { id: 'qt_3', name: '', roleOrTopic: '' },
    ],
  },
];

export const CreateMeetingSessionModal: React.FC<CreateMeetingSessionModalProps> = ({
  isOpen,
  onClose,
  onSubmitSession,
  userProfile,
}) => {
  const [meetingTitle, setMeetingTitle] = useState('Declamate’s Society Meeting Voting');
  const [meetingNumber, setMeetingNumber] = useState('');
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [categories, setCategories] = useState<CategoryFormState[]>(DEFAULT_CATEGORIES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('keynote_speakers');
  
  // Member quick picker state
  const [membersList, setMembersList] = useState<RegisteredMember[]>([]);
  const [memberPickerTarget, setMemberPickerTarget] = useState<{ catId: string; candIndex: number } | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Collect all currently appointed member records across all categories
  // Maps member identifiers to the category title & slot they are appointed in
  const appointedMembersMap = useMemo(() => {
    const map = new Map<string, { categoryTitle: string; categoryId: string; slotIndex: number; name: string }>();

    categories.forEach((cat) => {
      cat.candidates.forEach((cand, idx) => {
        if (!cand.name || !cand.name.trim()) return;

        const info = {
          categoryTitle: cat.title.replace(/^\d+\.\s*/, ''),
          categoryId: cat.id,
          slotIndex: idx + 1,
          name: cand.name.trim(),
        };

        if (cand.memberId) {
          map.set(`id:${cand.memberId}`, info);
        }
        if (cand.gmail) {
          map.set(`email:${cand.gmail.trim().toLowerCase()}`, info);
        }
        if (cand.name) {
          map.set(`name:${cand.name.trim().toLowerCase()}`, info);
        }
      });
    });

    return map;
  }, [categories]);

  // Helper to check if a registered member is already appointed in any role
  const getMemberAppointmentConflict = (
    member: RegisteredMember,
    currentCatId?: string,
    currentCandIdx?: number
  ) => {
    const checkKeys = [
      member.id ? `id:${member.id}` : null,
      member.gmail ? `email:${member.gmail.trim().toLowerCase()}` : null,
      member.name ? `name:${member.name.trim().toLowerCase()}` : null,
    ].filter(Boolean) as string[];

    for (const key of checkKeys) {
      if (appointedMembersMap.has(key)) {
        const existing = appointedMembersMap.get(key)!;
        // If it's the exact same slot we are editing, it's not a conflict
        if (currentCatId && currentCandIdx !== undefined) {
          if (existing.categoryId === currentCatId && existing.slotIndex === currentCandIdx + 1) {
            continue;
          }
        }
        return existing;
      }
    }
    return null;
  };

  useEffect(() => {
    if (isOpen) {
      fetchAllRegisteredMembers().then((data) => {
        if (data && data.length > 0) {
          setMembersList(data);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCandidateNameChange = (catId: string, candIndex: number, value: string) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== catId) return cat;
        const newCands = [...cat.candidates];
        newCands[candIndex] = { ...newCands[candIndex], name: value };
        return { ...cat, candidates: newCands };
      })
    );
  };

  const handleCandidateTopicChange = (catId: string, candIndex: number, value: string) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== catId) return cat;
        const newCands = [...cat.candidates];
        newCands[candIndex] = { ...newCands[candIndex], roleOrTopic: value };
        return { ...cat, candidates: newCands };
      })
    );
  };

  const handleAddCandidate = (catId: string) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== catId) return cat;
        const newId = `${cat.id}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
        return {
          ...cat,
          candidates: [
            ...cat.candidates,
            { id: newId, name: '', roleOrTopic: '' },
          ],
        };
      })
    );
  };

  const handleRemoveCandidate = (catId: string, candIndex: number) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== catId) return cat;
        if (cat.candidates.length <= 1) return cat;
        const newCands = cat.candidates.filter((_, idx) => idx !== candIndex);
        return { ...cat, candidates: newCands };
      })
    );
  };

  const handleClearCandidate = (catId: string, candIndex: number) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== catId) return cat;
        const newCands = [...cat.candidates];
        newCands[candIndex] = {
          id: newCands[candIndex].id,
          memberId: undefined,
          name: '',
          roleOrTopic: '',
          photoUrl: undefined,
          gmail: undefined,
          department: undefined,
          year: undefined,
          isCustomManual: false,
        };
        return { ...cat, candidates: newCands };
      })
    );
  };

  const handleToggleCustomManual = (catId: string, candIndex: number) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== catId) return cat;
        const newCands = [...cat.candidates];
        newCands[candIndex] = {
          ...newCands[candIndex],
          isCustomManual: !newCands[candIndex].isCustomManual,
        };
        return { ...cat, candidates: newCands };
      })
    );
  };

  const handleSelectMemberForCandidate = (member: RegisteredMember) => {
    if (!memberPickerTarget) return;
    const { catId, candIndex } = memberPickerTarget;

    // Strict Rule Check: Ensure member is not already appointed in another category or slot
    const conflict = getMemberAppointmentConflict(member, catId, candIndex);
    if (conflict) {
      setConflictWarning(
        `Cannot appoint ${member.name}: Already appointed in "${conflict.categoryTitle}" (Slot #${conflict.slotIndex}). Each member can only be appointed once!`
      );
      setTimeout(() => setConflictWarning(null), 4000);
      return;
    }

    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== catId) return cat;
        const newCands = [...cat.candidates];
        newCands[candIndex] = {
          ...newCands[candIndex],
          memberId: member.id,
          name: member.name,
          photoUrl: member.photoUrl || undefined,
          gmail: member.gmail || undefined,
          department: member.department || undefined,
          year: member.year || undefined,
          isCustomManual: false,
        };
        return { ...cat, candidates: newCands };
      })
    );
    setMemberPickerTarget(null);
    setMemberSearchQuery('');
    setConflictWarning(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim()) return;

    // Validate that each category has at least 2 non-empty candidates
    const formattedCategories: MeetingVotingCategory[] = categories.map((cat) => {
      // Filter candidates with non-empty names
      const validCands = cat.candidates
        .filter((c) => c.name.trim().length > 0)
        .map((c) => ({
          id: c.id || `cand_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: c.name.trim(),
          roleOrTopic: c.roleOrTopic?.trim() || undefined,
          photoUrl: c.photoUrl || undefined,
          memberEmail: c.gmail || undefined,
          department: c.department || undefined,
          year: c.year || undefined,
          votes: 0,
          voterEmails: [],
        }));

      return {
        id: cat.id,
        title: cat.title,
        subtitle: cat.subtitle,
        iconName: cat.iconName,
        candidates: validCands,
      };
    });

    const totalValidCandidates = formattedCategories.reduce((acc, cat) => acc + cat.candidates.length, 0);

    if (totalValidCandidates < 2) {
      alert('Please appoint members for at least one category before launching the voting session.');
      return;
    }

    // Strict Check: Ensure no duplicate candidate names across the entire voting session
    const seenNames = new Map<string, string>();
    for (const cat of formattedCategories) {
      for (const cand of cat.candidates) {
        const lowerName = cand.name.toLowerCase().trim();
        if (seenNames.has(lowerName)) {
          alert(`Duplicate appointment detected: "${cand.name}" is already appointed under "${seenNames.get(lowerName)}". Each member can only be appointed to 1 role in the meeting!`);
          return;
        }
        seenNames.set(lowerName, cat.title.replace(/^\d+\.\s*/, ''));
      }
    }

    setIsSubmitting(true);

    try {
      await onSubmitSession({
        title: meetingTitle.trim(),
        meetingNumber: meetingNumber.trim() || undefined,
        meetingDate: meetingDate || new Date().toISOString().split('T')[0],
        categories: formattedCategories.filter((cat) => cat.candidates.length > 0),
        isActive: true,
        createdAt: new Date().toISOString(),
        createdBy: {
          name: userProfile.name || 'Admin',
          gmail: userProfile.gmail || '',
          photoUrl: userProfile.photoUrl || '',
        },
        totalVoters: 0,
        votedUserEmails: [],
      });
      onClose();
    } catch (err) {
      console.error('Error creating meeting voting session:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'trophy':
        return <Trophy className="w-4 h-4 text-amber-400" />;
      case 'mic':
        return <Mic className="w-4 h-4 text-[#00A884]" />;
      case 'file-text':
        return <FileText className="w-4 h-4 text-sky-400" />;
      case 'zap':
        return <Zap className="w-4 h-4 text-yellow-400" />;
      default:
        return <Trophy className="w-4 h-4 text-[#C5A880]" />;
    }
  };

  const currentCategory = categories.find((c) => c.id === activeCategoryTab) || categories[0];

  const filteredMembers = membersList.filter((m) => {
    if (!memberSearchQuery.trim()) return true;
    const q = memberSearchQuery.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.department?.toLowerCase().includes(q) ||
      m.year?.toLowerCase().includes(q) ||
      m.gmail?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#0B141A] border border-[#2A3942] rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header with Close Button */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-[#1F2C34] flex items-center justify-between bg-[#0B141A]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-cinzel truncate">
              Appoint Members for 4 Roles:
            </span>
            <span className="text-[10px] sm:text-[11px] text-[#00A884] font-medium hidden sm:inline truncate">
              (Choose registered members to appoint for voting)
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#182229] transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Meeting Info Quick Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-[#111B21] rounded-2xl border border-[#1F2C34]">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-cinzel">
                Meeting Voting Title
              </label>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="e.g. Society Regular Meeting Voting"
                className="w-full px-3 py-2 bg-[#0B141A] border border-[#222E35] focus:border-[#00A884] rounded-xl text-xs text-white placeholder-slate-500 outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-cinzel">
                Meeting Date
              </label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B141A] border border-[#222E35] focus:border-[#00A884] rounded-xl text-xs text-white outline-none"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="text-xs font-bold text-[#00A884] font-cinzel">
                Role Categories (Appoint Members for Each):
              </span>
              <span className="text-[10px] text-amber-400/90 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                ⚡ 1 Role per Member Rule Active
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {categories.map((cat) => {
                const filledCount = cat.candidates.filter((c) => c.name.trim().length > 0).length;
                const isSelected = activeCategoryTab === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setActiveCategoryTab(cat.id);
                      setMemberPickerTarget(null);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#00A884]/15 border-[#00A884] text-white shadow-md'
                        : 'bg-[#111B21] border-[#1F2C34] text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="w-6 h-6 rounded-lg bg-[#0B141A] flex items-center justify-center shrink-0">
                        {getCategoryIcon(cat.iconName)}
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        filledCount > 0 ? 'bg-[#00A884]/20 text-[#00A884]' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {filledCount} appointed
                      </span>
                    </div>
                    <span className="text-xs font-bold truncate leading-tight font-cinzel">
                      {cat.title.replace(/^\d+\.\s*/, '')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Category Candidates Form Card */}
          <div className="bg-[#111B21] rounded-2xl border border-[#1F2C34] p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#182229]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0B141A] border border-[#222E35] flex items-center justify-center">
                  {getCategoryIcon(currentCategory.iconName)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-cinzel">
                    {currentCategory.title}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Appoint members for this voting role. Their name &amp; photo will appear on ballots.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAddCandidate(currentCategory.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00A884]/15 hover:bg-[#00A884]/25 text-[#00A884] text-xs font-bold border border-[#00A884]/30 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>+ Add Slot</span>
              </button>
            </div>

            {/* Candidates Appointed List */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {currentCategory.candidates.map((cand, idx) => {
                const hasAppointedMember = cand.name.trim().length > 0;

                if (hasAppointedMember) {
                  return (
                    <div
                      key={cand.id || idx}
                      className="bg-[#0B141A] p-3 rounded-2xl border border-[#00A884]/50 shadow-sm space-y-2.5 transition-all animate-fadeIn"
                    >
                      <div className="flex items-center gap-3">
                        {/* Slot Badge */}
                        <span className="w-7 h-7 rounded-xl bg-[#00A884]/20 text-[#00A884] text-xs font-bold flex items-center justify-center shrink-0 border border-[#00A884]/40 font-mono">
                          #{idx + 1}
                        </span>

                        {/* Member Photo */}
                        <div className="relative shrink-0">
                          {cand.photoUrl ? (
                            <img
                              src={cand.photoUrl}
                              alt={cand.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-[#00A884] shadow-md"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#00A884]/20 text-[#00A884] border border-[#00A884]/50 flex items-center justify-center font-bold text-sm shadow-md font-cinzel">
                              {cand.name ? cand.name.charAt(0).toUpperCase() : '?'}
                            </div>
                          )}
                        </div>

                        {/* Member Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="text-xs sm:text-sm font-bold text-white truncate font-cinzel">
                              {cand.name}
                            </h5>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-[#00A884]/20 text-[#00A884] border border-[#00A884]/30">
                              Appointed
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">
                            {cand.department
                              ? `${cand.year ? `${cand.year} • ` : ''}${cand.department}`
                              : cand.gmail || 'Club Member'}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setMemberPickerTarget({ catId: currentCategory.id, candIndex: idx });
                              setMemberSearchQuery('');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-[#111B21] hover:bg-[#1A2730] text-[#00A884] hover:text-[#00c59b] border border-[#00A884]/30 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                            title="Change Appointed Member"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Change</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleClearCandidate(currentCategory.id, idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-[#182229] transition-all cursor-pointer"
                            title="Clear this slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                {/* EMPTY CANDIDATE SLOT - PROMINENT "CHOOSE THE MEMBER" BUTTON */}
                return (
                  <div
                    key={cand.id || idx}
                    className="bg-[#0B141A] p-3 sm:p-3.5 rounded-2xl border-2 border-dashed border-[#1F2C34] hover:border-[#00A884]/60 transition-all space-y-2"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      {/* Slot Index Badge */}
                      <span className="w-8 h-8 rounded-xl bg-[#111B21] text-slate-400 text-xs font-bold flex items-center justify-center shrink-0 border border-[#222E35] font-mono">
                        #{idx + 1}
                      </span>

                      {/* Primary "Choose the Member" Button */}
                      {!cand.isCustomManual ? (
                        <button
                          type="button"
                          id={`choose-member-btn-${currentCategory.id}-${idx}`}
                          onClick={() => {
                            setMemberPickerTarget({ catId: currentCategory.id, candIndex: idx });
                            setMemberSearchQuery('');
                          }}
                          className="flex-1 py-2.5 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-[#00A884]/20 via-[#00A884]/10 to-transparent hover:from-[#00A884]/30 hover:via-[#00A884]/20 border border-[#00A884]/40 hover:border-[#00A884] text-[#00A884] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer group active:scale-[0.98] shadow-sm"
                        >
                          <UserPlus className="w-4 h-4 text-[#00A884] group-hover:scale-110 transition-transform shrink-0" />
                          <span className="font-cinzel tracking-wide">Appoint</span>
                        </button>
                      ) : (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={cand.name}
                            onChange={(e) => handleCandidateNameChange(currentCategory.id, idx, e.target.value)}
                            placeholder={`Enter candidate name for Slot #${idx + 1}...`}
                            className="flex-1 px-3 py-2 bg-[#111B21] border border-[#00A884] rounded-xl text-xs text-white placeholder-slate-500 outline-none"
                            autoFocus
                          />
                        </div>
                      )}

                      {/* Custom manual toggle / Slot removal */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleCustomManual(currentCategory.id, idx)}
                          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#111B21] text-xs transition-colors cursor-pointer"
                          title={cand.isCustomManual ? 'Switch back to member list' : 'Type manual name instead'}
                        >
                          {cand.isCustomManual ? <Users className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                        </button>

                        {currentCategory.candidates.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCandidate(currentCategory.id, idx)}
                            className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-[#111B21] transition-colors cursor-pointer"
                            title="Remove candidate slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>

        {/* Modal Action Footer */}
        <div className="bg-[#0B141A] px-5 py-4 border-t border-[#1F2C34] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[#111B21] border border-[#222E35] text-slate-300 hover:text-white text-xs font-semibold cursor-pointer active:scale-95 transition-all"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none px-7 py-3 rounded-xl bg-[#00A884] hover:bg-[#009272] text-[#111B21] font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#00A884]/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Publishing Session...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>🚀 Launch 4-Role Voting Session</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Appoint Member Modal Picker Overlay */}
      {memberPickerTarget && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
          <div className="bg-[#0B141A] border border-[#00A884]/60 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Picker Header */}
            <div className="p-4 sm:p-5 border-b border-[#1F2C34] bg-[#0A192F]/70 flex items-center justify-between">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#00A884]/20 text-[#00A884] flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white font-cinzel truncate">
                    Appoint
                  </h3>
                </div>
                <p className="text-xs text-slate-300 truncate">
                  Appointing to: <span className="text-[#00A884] font-semibold">{currentCategory.title}</span> (Slot #{memberPickerTarget.candIndex + 1})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMemberPickerTarget(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#182229] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3.5 border-b border-[#1F2C34] bg-[#0B141A] space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Search member by name, department, or year..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#111B21] border border-[#222E35] focus:border-[#00A884] rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 outline-none"
                  autoFocus
                />
              </div>

              {/* Conflict Warning Banner if triggered */}
              {conflictWarning && (
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-medium">{conflictWarning}</span>
                </div>
              )}
            </div>

            {/* Members List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
              {filteredMembers.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Users className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">
                    {membersList.length === 0
                      ? 'No registered club members found yet.'
                      : `No members found matching "${memberSearchQuery}"`}
                  </p>
                </div>
              ) : (
                filteredMembers.map((m) => {
                  const conflict = getMemberAppointmentConflict(
                    m,
                    memberPickerTarget?.catId,
                    memberPickerTarget?.candIndex
                  );

                  return (
                    <div
                      key={m.id || m.gmail}
                      onClick={() => {
                        if (!conflict) {
                          handleSelectMemberForCandidate(m);
                        } else {
                          setConflictWarning(
                            `Cannot appoint ${m.name}: Already appointed in "${conflict.categoryTitle}" (Slot #${conflict.slotIndex}). Each member can hold only 1 role.`
                          );
                          setTimeout(() => setConflictWarning(null), 4000);
                        }
                      }}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        conflict
                          ? 'bg-[#141B21]/60 border-rose-900/30 opacity-70 cursor-not-allowed'
                          : 'bg-[#111B21] hover:bg-[#00A884]/15 border-[#1F2C34] hover:border-[#00A884]/60 cursor-pointer group active:scale-[0.99]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {m.photoUrl ? (
                          <img
                            src={m.photoUrl}
                            alt={m.name}
                            className={`w-10 h-10 rounded-full object-cover shrink-0 border ${
                              conflict ? 'border-rose-500/40 grayscale' : 'border-[#00A884]/40'
                            }`}
                          />
                        ) : (
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 font-cinzel border ${
                              conflict
                                ? 'bg-rose-950/20 text-rose-400 border-rose-800/30'
                                : 'bg-[#00A884]/20 text-[#00A884] border-[#00A884]/30'
                            }`}
                          >
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4
                              className={`text-xs sm:text-sm font-bold truncate font-cinzel ${
                                conflict
                                  ? 'text-slate-400'
                                  : 'text-white group-hover:text-[#00A884] transition-colors'
                              }`}
                            >
                              {m.name}
                            </h4>
                            {conflict && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-950/60 text-rose-300 border border-rose-500/30">
                                Already Appointed: {conflict.categoryTitle}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] sm:text-xs text-slate-400 truncate mt-0.5">
                            {m.year ? `${m.year} • ` : ''}{m.department || m.gmail}
                          </p>
                        </div>
                      </div>

                      {conflict ? (
                        <span className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 text-rose-400 border border-rose-900/40 text-[10px] font-bold uppercase tracking-wider shrink-0">
                          Unavailable
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg bg-[#00A884]/20 text-[#00A884] group-hover:bg-[#00A884] group-hover:text-[#111B21] font-bold text-xs transition-all shrink-0 uppercase tracking-wider"
                        >
                          Appoint
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Picker Footer */}
            <div className="p-3 border-t border-[#1F2C34] bg-[#0B141A] flex items-center justify-between text-xs text-slate-400">
              <span>{filteredMembers.length} registered members</span>
              <button
                type="button"
                onClick={() => setMemberPickerTarget(null)}
                className="px-3 py-1 rounded-lg bg-[#111B21] hover:text-white text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
