import React, { useState, useEffect } from 'react';
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
  Calendar,
  Layers,
  Search,
  Check
} from 'lucide-react';
import { UserProfile, MeetingVotingSession, MeetingVotingCategory, MeetingCandidate, RegisteredMember } from '../types';
import { fetchAllRegisteredMembers } from '../firebase';

interface CreateMeetingSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSession: (session: Omit<MeetingVotingSession, 'id'>) => Promise<void>;
  userProfile: UserProfile;
}

interface CategoryFormState {
  id: string;
  title: string;
  subtitle: string;
  iconName: string;
  candidates: {
    id: string;
    name: string;
    roleOrTopic: string;
  }[];
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

  const handleSelectMemberForCandidate = (member: RegisteredMember) => {
    if (!memberPickerTarget) return;
    const { catId, candIndex } = memberPickerTarget;
    handleCandidateNameChange(catId, candIndex, member.name);
    setMemberPickerTarget(null);
    setMemberSearchQuery('');
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
          roleOrTopic: c.roleOrTopic.trim() || undefined,
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
      alert('Please fill in candidate names for at least one category before launching the voting session.');
      return;
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
      m.year?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#0B141A] border border-[#2A3942] rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header with Close Button */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-[#1F2C34] flex items-center justify-between bg-[#0B141A]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-cinzel truncate">
              Configure 4 Role Categories:
            </span>
            <span className="text-[10px] sm:text-[11px] text-[#00A884] font-medium hidden sm:inline truncate">
              (Tap each tab to enter candidate names)
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
          {/* Category Tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between sm:hidden">
              <span className="text-[11px] text-[#00A884] font-medium">
                Tap each tab to enter candidate names:
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
                        {filledCount} added
                      </span>
                    </div>
                    <span className="text-xs font-bold truncate leading-tight">
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
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAddCandidate(currentCategory.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00A884]/15 hover:bg-[#00A884]/25 text-[#00A884] text-xs font-bold border border-[#00A884]/30 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>+ Add Candidate</span>
              </button>
            </div>

            {/* Candidates input list */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {currentCategory.candidates.map((cand, idx) => (
                <div
                  key={cand.id || idx}
                  className="flex items-center gap-2 bg-[#0B141A] p-2.5 rounded-xl border border-[#1F2C34] hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-[#111B21] text-slate-400 text-xs font-bold flex items-center justify-center shrink-0 border border-[#222E35]">
                      {idx + 1}
                    </span>

                    {/* Candidate Name Input */}
                    <input
                      type="text"
                      value={cand.name}
                      onChange={(e) => handleCandidateNameChange(currentCategory.id, idx, e.target.value)}
                      placeholder={`Nominee name (e.g. Member ${idx + 1})`}
                      className="w-full px-3 py-1.5 bg-[#111B21] border border-[#222E35] focus:border-[#00A884] rounded-lg text-xs text-white placeholder-slate-500 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Quick Pick from Registered Members Button */}
                    {membersList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setMemberPickerTarget(
                            memberPickerTarget?.catId === currentCategory.id && memberPickerTarget?.candIndex === idx
                              ? null
                              : { catId: currentCategory.id, candIndex: idx }
                          );
                        }}
                        className={`p-2 rounded-lg border transition-all cursor-pointer ${
                          memberPickerTarget?.catId === currentCategory.id && memberPickerTarget?.candIndex === idx
                            ? 'bg-[#00A884] text-[#111B21] border-[#00A884]'
                            : 'bg-[#111B21] text-slate-400 hover:text-white border-[#222E35]'
                        }`}
                        title="Select from registered members list"
                      >
                        <Users className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete Candidate Button */}
                    {currentCategory.candidates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCandidate(currentCategory.id, idx)}
                        className="p-2 text-slate-500 hover:text-rose-400 active:scale-95 transition-all cursor-pointer"
                        title="Remove candidate"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Member Quick-Picker Dropdown / Drawer if opened */}
            {memberPickerTarget && memberPickerTarget.catId === currentCategory.id && (
              <div className="bg-[#0B141A] rounded-2xl border border-[#00A884]/40 p-3 space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#00A884] flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Select Member for Slot #{memberPickerTarget.candIndex + 1}:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMemberPickerTarget(null)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    Close
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder="Search member by name, department, or year..."
                    className="w-full pl-8 pr-3 py-1.5 bg-[#111B21] border border-[#222E35] focus:border-[#00A884] rounded-lg text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {filteredMembers.slice(0, 18).map((m) => (
                    <button
                      key={m.id || m.gmail}
                      type="button"
                      onClick={() => handleSelectMemberForCandidate(m)}
                      className="p-2 rounded-lg bg-[#111B21] hover:bg-[#00A884]/20 border border-[#222E35] hover:border-[#00A884]/50 text-left transition-all cursor-pointer flex items-center gap-2 group"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#00A884]/20 text-[#00A884] font-bold text-[10px] flex items-center justify-center shrink-0">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                          {m.name}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {m.year} • {m.department}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
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
    </div>
  );
};
