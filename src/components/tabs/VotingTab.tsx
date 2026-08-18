import React, { useState, useEffect } from 'react';
import { 
  Vote, 
  Plus, 
  Sparkles, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Users, 
  Crown, 
  Share2, 
  Trash2, 
  Power, 
  Check, 
  ChevronDown, 
  ChevronUp,
  Lock,
  Unlock,
  AlertCircle,
  EyeOff,
  Trophy,
  X,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import { UserProfile, Poll } from '../../types';
import { CreatePollModal } from '../CreatePollModal';
import { 
  subscribeToPolls, 
  createPollInFirebase, 
  submitVoteInFirebase, 
  togglePollStatus, 
  deletePoll 
} from '../../firebase';

interface VotingTabProps {
  userProfile?: UserProfile;
}

export const VotingTab: React.FC<VotingTabProps> = ({ userProfile }) => {
  const currentUser = userProfile || {
    name: 'Member',
    gmail: 'member@declamates.club',
    phone: '',
    department: '',
    photoUrl: '',
    isAdmin: false,
  };

  const userEmail = currentUser.gmail.trim().toLowerCase();
  const isAdmin = Boolean(
    currentUser.isAdmin ||
    userEmail === 'vjana537@gmail.com'
  );

  const [polls, setPolls] = useState<Poll[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [pollToDelete, setPollToDelete] = useState<Poll | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'my' | 'ended'>('all');
  const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<string, string[]>>({});
  const [expandedVotersPollId, setExpandedVotersPollId] = useState<string | null>(null);
  const [copiedPollId, setCopiedPollId] = useState<string | null>(null);
  const [votingInProgressId, setVotingInProgressId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Subscribe to real-time polls updates from Firebase & local storage
  useEffect(() => {
    const unsubscribe = subscribeToPolls((updatedPolls) => {
      setPolls(updatedPolls);
    });

    return () => unsubscribe();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleCreatePoll = async (pollData: Omit<Poll, 'id'>) => {
    if (!isAdmin) {
      showToast('Admin privilege required to create polls.');
      return;
    }
    const result = await createPollInFirebase(pollData);
    if (result.success && result.poll) {
      // Optimistic update in UI
      setPolls((prev) => [result.poll, ...prev.filter((p) => p.id !== result.poll.id)]);
      showToast('Voting poll published!');
    }
  };

  const handleOptionSelect = (poll: Poll, optionId: string) => {
    if (!poll.isActive) return;

    const currentSelections = selectedOptionsMap[poll.id] || [];

    if (poll.allowMultipleAnswers) {
      if (currentSelections.includes(optionId)) {
        setSelectedOptionsMap({
          ...selectedOptionsMap,
          [poll.id]: currentSelections.filter((id) => id !== optionId),
        });
      } else {
        setSelectedOptionsMap({
          ...selectedOptionsMap,
          [poll.id]: [...currentSelections, optionId],
        });
      }
    } else {
      setSelectedOptionsMap({
        ...selectedOptionsMap,
        [poll.id]: [optionId],
      });
    }
  };

  const handleCastVote = async (poll: Poll) => {
    if (!poll.isActive) return;

    const selected = selectedOptionsMap[poll.id] || [];
    if (selected.length === 0) {
      showToast('Please select an option to vote');
      return;
    }

    setVotingInProgressId(poll.id);
    try {
      const email = userEmail || 'anonymous@declamates.club';
      const result = await submitVoteInFirebase(poll.id, selected, email);
      
      if (result.updatedPoll) {
        // Optimistic state update
        setPolls((prev) =>
          prev.map((p) => (p.id === poll.id ? result.updatedPoll! : p))
        );
      }
      showToast('Vote submitted! Results will appear once closed.');
    } catch {
      showToast('Vote recorded.');
    } finally {
      setVotingInProgressId(null);
    }
  };

  const handleRetractVote = async (poll: Poll) => {
    if (!poll.isActive) return;

    setVotingInProgressId(poll.id);
    try {
      const email = userEmail || 'anonymous@declamates.club';
      const result = await submitVoteInFirebase(poll.id, [], email);
      
      if (result.updatedPoll) {
        setPolls((prev) =>
          prev.map((p) => (p.id === poll.id ? result.updatedPoll! : p))
        );
      }

      const newMap = { ...selectedOptionsMap };
      delete newMap[poll.id];
      setSelectedOptionsMap(newMap);
      
      showToast('Select your choice and submit');
    } catch {
      showToast('Could not reset vote');
    } finally {
      setVotingInProgressId(null);
    }
  };

  const handleToggleStatus = async (pollId: string, currentStatus: boolean) => {
    if (!isAdmin) {
      showToast('Only Admins can open or close voting sessions.');
      return;
    }
    const nextStatus = !currentStatus;
    
    // 1. Instant optimistic update in React state so UI updates immediately
    setPolls((prevPolls) =>
      prevPolls.map((p) => (p.id === pollId ? { ...p, isActive: nextStatus } : p))
    );

    // 2. Persist change in localStorage and Firebase Firestore
    await togglePollStatus(pollId, nextStatus);

    showToast(nextStatus ? 'Voting session reopened!' : 'Voting closed & results revealed!');
  };

  const handleRequestDelete = (poll: Poll) => {
    if (!isAdmin) {
      showToast('Only Admins can delete voting sessions.');
      return;
    }
    setPollToDelete(poll);
  };

  const handleConfirmDelete = async () => {
    if (!pollToDelete || !isAdmin) return;
    const targetId = pollToDelete.id;

    // 1. Instant optimistic delete in React state
    setPolls((prev) => prev.filter((p) => p.id !== targetId));
    setPollToDelete(null);

    // 2. Persist deletion
    await deletePoll(targetId);
    showToast('Poll deleted successfully.');
  };

  const handleShare = async (poll: Poll) => {
    const shareData = {
      title: `Declamate's Poll: ${poll.question}`,
      text: `🗳️ Vote in Declamate's Society: "${poll.question}"`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fallback
      }
    }

    try {
      await navigator.clipboard.writeText(`🗳️ Declamate's Society Voting: "${poll.question}"\nVote now at: ${window.location.href}`);
      setCopiedPollId(poll.id);
      showToast('Poll link copied!');
      setTimeout(() => setCopiedPollId(null), 2500);
    } catch {
      showToast('Link copied!');
    }
  };

  // Filter polls
  const filteredPolls = polls.filter((poll) => {
    if (selectedFilter === 'active') return poll.isActive;
    if (selectedFilter === 'ended') return !poll.isActive;
    if (selectedFilter === 'my') {
      return (
        poll.createdBy?.gmail?.toLowerCase() === userEmail ||
        poll.createdBy?.name?.toLowerCase() === currentUser.name?.toLowerCase()
      );
    }
    return true;
  });

  const activeCount = polls.filter((p) => p.isActive).length;

  return (
    <div className="w-full text-slate-100 selection:bg-[#C5A880] selection:text-[#0A192F]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 sm:top-24 left-1/2 -translate-x-1/2 z-50 bg-[#00A884] text-[#111B21] px-4 py-2 rounded-full font-bold shadow-2xl flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap border border-[#25D366] animate-bounce">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* In-App Delete Confirmation Modal (Admin only) */}
      {pollToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B141A] border border-[#2A3942] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Delete Voting Session?</h3>
              <p className="text-xs text-slate-400">
                "{pollToDelete.question}" will be permanently removed. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPollToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#111B21] border border-[#222E35] text-slate-300 hover:text-white text-xs font-semibold cursor-pointer active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. MOBILE VIEW (WhatsApp / Mobile App Style - Enabled via @media)         */}
      {/* ========================================================================= */}
      <div className="voting-mobile-layout w-full">
        {/* Mobile Header Banner */}
        <div className="w-full bg-[#0B141A] border-b border-[#1F2C34] p-3.5 space-y-3 rounded-xl shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#111B21] border border-[#00A884]/40 text-[#00A884] flex items-center justify-center">
                <Vote className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider font-cinzel">
                    Polling Center
                  </h2>
                  {isAdmin && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/30">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">
                  Secret ballot voting for members
                </p>
              </div>
            </div>

            {activeCount > 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#00A884]/20 text-[#00A884] text-[11px] font-bold border border-[#00A884]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00A884] animate-ping" />
                {activeCount} Active
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-[#1E2E48] text-slate-400 text-[10px]">
                0 Active
              </span>
            )}
          </div>

          {/* Prominent WhatsApp Green + ADD VOTING Button (ONLY SHOWN FOR ADMIN) */}
          {isAdmin && (
            <button
              type="button"
              id="mobile-add-voting-btn"
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full py-3 px-4 rounded-xl bg-[#00A884] active:bg-[#009272] text-[#111B21] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#00A884]/20 transition-transform active:scale-[0.98] cursor-pointer min-h-[44px]"
            >
              <div className="w-5 h-5 rounded-full bg-[#111B21] text-[#00A884] flex items-center justify-center font-bold">
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <span>+ Add Voting</span>
            </button>
          )}
        </div>

        {/* Horizontal Filter Tabs for Mobile */}
        <div className="w-full flex items-center gap-1.5 overflow-x-auto py-1 px-0.5 scrollbar-none no-scrollbar">
          {[
            { id: 'all', label: 'All', count: polls.length },
            { id: 'active', label: 'Active', count: activeCount },
            { id: 'my', label: 'My Polls', count: polls.filter(p => p.createdBy?.gmail?.toLowerCase() === userEmail).length },
            { id: 'ended', label: 'Closed', count: polls.filter(p => !p.isActive).length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                selectedFilter === tab.id
                  ? 'bg-[#00A884] text-[#111B21] font-bold shadow-sm'
                  : 'bg-[#0B141A] text-slate-300 border border-[#1F2C34]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedFilter === tab.id ? 'bg-[#111B21] text-[#00A884]' : 'bg-[#182229] text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Mobile Poll Feed Cards */}
        {filteredPolls.length === 0 ? (
          <div className="w-full bg-[#0B141A] rounded-xl border border-[#1F2C34] p-8 text-center space-y-3 shadow-md my-2">
            <div className="w-12 h-12 rounded-full bg-[#111B21] border border-[#00A884]/40 text-[#00A884] flex items-center justify-center mx-auto">
              <Vote className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-cinzel text-sm font-bold text-white uppercase tracking-wider">
                {selectedFilter === 'all' ? 'No Active Polls' : `No ${selectedFilter} polls`}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isAdmin
                  ? 'Tap the button below to start a new club voting session.'
                  : 'Active voting sessions opened by admins will appear here.'}
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00A884] text-[#111B21] font-bold text-xs uppercase tracking-wider active:scale-95 transition-transform cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Create Poll</span>
              </button>
            )}
          </div>
        ) : (
          <div className="w-full space-y-3">
            {filteredPolls.map((poll) => {
              const hasUserVoted = poll.votedUserEmails?.includes(userEmail);
              
              const maxVotes = Math.max(...poll.options.map((o) => o.votes), 0);
              const totalPollVotes = poll.totalVotes || 0;
              const currentSelected = selectedOptionsMap[poll.id] || [];
              const isVotersExpanded = expandedVotersPollId === poll.id;
              
              // Results (percentages, counts, crowns, bars) are ONLY shown when the poll is closed!
              const showResults = !poll.isActive;

              return (
                <div
                  key={poll.id}
                  className="w-full bg-[#0B141A] rounded-xl border border-[#1F2C34] p-3.5 space-y-3 shadow-md"
                >
                  {/* Top Poll Info */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {poll.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00A884]/20 text-[#00A884] text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00A884] animate-pulse" />
                            Live Voting (Open)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#C5A880]/20 text-[#C5A880] text-[10px] font-bold border border-[#C5A880]/40">
                            <Trophy className="w-3 h-3 text-[#C5A880]" />
                            Voting Closed • Results Declared
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-slate-500">
                        {new Date(poll.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                      {poll.question}
                    </h3>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span className="truncate max-w-[200px]">
                        Host: {poll.createdBy?.name || 'Club Member'}
                      </span>
                      {poll.isActive && (
                        <span className="text-amber-400/90 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Secret Ballot</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="space-y-2">
                    {poll.options.map((option) => {
                      const optionVotes = option.votes || 0;
                      const percentage = totalPollVotes > 0 ? Math.round((optionVotes / totalPollVotes) * 100) : 0;
                      const isSelected = currentSelected.includes(option.id);
                      const userVotedThis = option.voterEmails?.includes(userEmail);
                      const isLeader = maxVotes > 0 && optionVotes === maxVotes;

                      return (
                        <div
                          key={option.id}
                          onClick={() => {
                            if (poll.isActive && (!hasUserVoted || currentSelected.length > 0)) {
                              handleOptionSelect(poll, option.id);
                            }
                          }}
                          className={`relative p-3 rounded-lg border transition-all select-none min-h-[46px] flex items-center ${
                            poll.isActive && (!hasUserVoted || currentSelected.length > 0)
                              ? 'cursor-pointer active:scale-[0.99]'
                              : 'cursor-default'
                          } ${
                            showResults
                              ? isLeader && totalPollVotes > 0
                                ? 'bg-[#00A884]/15 border-[#00A884] text-white'
                                : 'bg-[#111B21] border-[#222E35] text-slate-200'
                              : isSelected || (hasUserVoted && userVotedThis)
                              ? 'bg-[#00A884]/15 border-[#00A884] text-white shadow-sm'
                              : 'bg-[#111B21] border-[#222E35] text-slate-200'
                          }`}
                        >
                          {/* Progress bar fill - ONLY SHOWN WHEN POLL IS CLOSED */}
                          {showResults && (
                            <div
                              className={`absolute left-0 top-0 bottom-0 rounded-lg transition-all duration-500 ${
                                userVotedThis
                                  ? 'bg-[#00A884]/25 border-r-2 border-[#00A884]'
                                  : isLeader && totalPollVotes > 0
                                  ? 'bg-[#C5A880]/20'
                                  : 'bg-slate-700/20'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          )}

                          <div className="relative z-10 flex items-center justify-between gap-2.5 w-full">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              {/* Checkbox / Radio state */}
                              {poll.isActive ? (
                                hasUserVoted && currentSelected.length === 0 ? (
                                  userVotedThis ? (
                                    <span className="shrink-0 w-4 h-4 rounded-full bg-[#00A884] text-[#111B21] flex items-center justify-center text-[10px] font-bold shadow-sm">
                                      <Check className="w-3 h-3 stroke-[3]" />
                                    </span>
                                  ) : (
                                    <span className="shrink-0 w-4 h-4 rounded-full border border-slate-600" />
                                  )
                                ) : (
                                  <div className="shrink-0 text-[#00A884]">
                                    {isSelected ? (
                                      <CheckCircle2 className="w-4.5 h-4.5 fill-[#00A884] text-[#111B21]" />
                                    ) : (
                                      <Circle className="w-4.5 h-4.5 text-slate-500" />
                                    )}
                                  </div>
                                )
                              ) : (
                                userVotedThis && (
                                  <span className="shrink-0 w-4 h-4 rounded-full bg-[#00A884] text-[#111B21] flex items-center justify-center text-[10px] font-bold">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  </span>
                                )
                              )}

                              <span className="text-xs font-medium leading-snug break-words">
                                {option.text}
                              </span>
                            </div>

                            {/* Results Display (Percentages, Crown, Counts) - ONLY SHOWN WHEN CLOSED */}
                            {showResults ? (
                              <div className="flex items-center gap-1 shrink-0 text-right">
                                {isLeader && totalPollVotes > 0 && (
                                  <Crown className="w-3.5 h-3.5 text-[#C5A880] fill-[#C5A880]" />
                                )}
                                <span className="text-xs font-bold text-slate-200">
                                  {percentage}%
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  ({optionVotes})
                                </span>
                              </div>
                            ) : (
                              /* While Active: show a subtle badge for user choice */
                              hasUserVoted && userVotedThis && (
                                <span className="text-[10px] text-[#00A884] font-medium shrink-0 bg-[#00A884]/15 px-2 py-0.5 rounded">
                                  Your Choice
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Active Confidential Notice while voting is in progress */}
                  {poll.isActive && hasUserVoted && currentSelected.length === 0 && (
                    <div className="p-2.5 bg-[#050B10] rounded-lg border border-[#1F2C34] flex items-center gap-2 text-[11px] text-slate-400">
                      <Lock className="w-3.5 h-3.5 text-[#00A884] shrink-0" />
                      <span>
                        Your vote has been cast. Results will be declared once the host closes the voting.
                      </span>
                    </div>
                  )}

                  {/* Poll Actions & Vote Button */}
                  <div className="pt-1.5 border-t border-[#182229] space-y-2">
                    <div className="flex items-center justify-between">
                      {/* Vote Count Info */}
                      {showResults ? (
                        <button
                          type="button"
                          onClick={() => setExpandedVotersPollId(isVotersExpanded ? null : poll.id)}
                          className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 py-1 cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5 text-[#00A884]" />
                          <span>{totalPollVotes} votes total</span>
                          {totalPollVotes > 0 && (
                            <span className="text-[#00A884] font-medium ml-1">
                              {isVotersExpanded ? '▲ Hide Breakdown' : '▼ View Breakdown'}
                            </span>
                          )}
                        </button>
                      ) : (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 py-1">
                          <Users className="w-3.5 h-3.5 text-[#00A884]" />
                          <span>{totalPollVotes} {totalPollVotes === 1 ? 'member voted' : 'members voted'}</span>
                        </div>
                      )}

                      {/* Action buttons (Share for everyone; Close/Reopen & Delete ONLY FOR ADMIN) */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleShare(poll)}
                          className="p-2 text-slate-400 hover:text-white rounded-lg bg-[#111B21] border border-[#222E35] active:scale-95 transition-transform cursor-pointer"
                          title="Share"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Admin-Only Control Buttons */}
                        {isAdmin && (
                          <>
                            {/* Prominent Close / Reopen Toggle Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(poll.id, poll.isActive)}
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border transition-all active:scale-95 cursor-pointer ${
                                poll.isActive
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                                  : 'bg-[#00A884]/20 text-[#00A884] border-[#00A884]/50 hover:bg-[#00A884]/30'
                              }`}
                              title={poll.isActive ? 'Close voting to reveal results' : 'Reopen voting'}
                            >
                              {poll.isActive ? (
                                <>
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>Close &amp; Declare</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3.5 h-3.5" />
                                  <span>Reopen</span>
                                </>
                              )}
                            </button>

                            {/* Delete Button with In-App Confirmation */}
                            <button
                              type="button"
                              onClick={() => handleRequestDelete(poll)}
                              className="p-2 text-slate-400 hover:text-rose-400 active:text-rose-300 rounded-lg bg-[#111B21] border border-[#222E35] active:scale-95 transition-transform cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Primary Button */}
                    {poll.isActive && (
                      <div>
                        {hasUserVoted && currentSelected.length === 0 ? (
                          <button
                            type="button"
                            onClick={() => handleRetractVote(poll)}
                            disabled={votingInProgressId === poll.id}
                            className="w-full py-2.5 rounded-lg bg-[#111B21] border border-[#222E35] text-slate-300 hover:text-white text-xs font-semibold cursor-pointer active:bg-[#202C33]"
                          >
                            Change My Vote
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCastVote(poll)}
                            disabled={currentSelected.length === 0 || votingInProgressId === poll.id}
                            className="w-full py-2.5 rounded-lg bg-[#00A884] active:bg-[#009272] text-[#111B21] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                          >
                            {votingInProgressId === poll.id ? (
                              <span>Submitting...</span>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>{hasUserVoted ? 'Update Vote' : 'Submit Ballot'}</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Voter distribution details (ONLY WHEN POLL IS CLOSED) */}
                    {showResults && isVotersExpanded && totalPollVotes > 0 && (
                      <div className="p-2.5 bg-[#050B10] rounded-lg border border-[#1F2C34] text-[11px] space-y-1">
                        <p className="font-semibold text-slate-300">Final Vote Breakdown:</p>
                        {poll.options.map((opt) => (
                          <div key={opt.id} className="flex items-center justify-between text-slate-400 py-0.5">
                            <span className="truncate pr-2">{opt.text}</span>
                            <span className="font-bold text-[#00A884]">
                              {opt.votes} {opt.votes === 1 ? 'vote' : 'votes'}
                            </span>
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
      </div>

      {/* ========================================================================= */}
      {/* 2. LAPTOP / DESKTOP VIEW (Luxury Gold & Navy Dashboard Layout)             */}
      {/* ========================================================================= */}
      <div className="voting-desktop-layout w-full space-y-6 max-w-5xl mx-auto">
        {/* Desktop Header Banner */}
        <div className="rounded-3xl bg-gradient-to-br from-[#02050B] via-[#0A192F] to-[#040A17] text-white p-8 border border-[#C5A880]/40 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C5A880]/20 text-[#C5A880] text-xs font-semibold uppercase tracking-wider border border-[#C5A880]/40 font-cinzel">
                  <Vote className="w-3.5 h-3.5" />
                  <span>Official Society Polling</span>
                </span>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Admin Mode
                  </span>
                )}
                {activeCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00A884]/20 text-[#00A884] text-xs font-bold border border-[#00A884]/30">
                    <span className="w-2 h-2 rounded-full bg-[#00A884] animate-ping" />
                    {activeCount} Live Sessions
                  </span>
                )}
              </div>

              <h2 className="text-3xl font-bold font-cinzel text-white tracking-wide">
                Secret Ballot Member Voting
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed max-w-xl">
                Cast secret ballots for keynote speeches and evaluations. Results are revealed once the host closes the session.
              </p>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl bg-[#00A884] hover:bg-[#009272] text-[#111B21] font-bold text-sm shadow-xl shadow-[#00A884]/30 hover:scale-105 transition-all cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-[#111B21] text-[#00A884] flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4 stroke-[3]" />
                </div>
                <span className="tracking-wider uppercase font-cinzel text-sm">
                  + Add Voting
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2.5">
          {[
            { id: 'all', label: 'All Polls', count: polls.length },
            { id: 'active', label: 'Active Sessions', count: activeCount },
            { id: 'my', label: 'My Polls', count: polls.filter(p => p.createdBy?.gmail?.toLowerCase() === userEmail).length },
            { id: 'ended', label: 'Closed Sessions', count: polls.filter(p => !p.isActive).length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                selectedFilter === tab.id
                  ? 'bg-[#C5A880] text-[#0A192F] font-bold shadow-md shadow-[#C5A880]/20'
                  : 'bg-[#0B1528] text-slate-300 hover:bg-[#112240] border border-[#1E2E48]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                selectedFilter === tab.id ? 'bg-[#0A192F] text-[#C5A880]' : 'bg-[#1E2E48] text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Desktop Grid Feed */}
        {filteredPolls.length === 0 ? (
          <div className="bg-[#050B14] rounded-3xl border border-[#1E2E48] p-12 text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-[#0B1528] border border-[#C5A880]/40 text-[#C5A880] flex items-center justify-center mx-auto shadow-lg">
              <Vote className="w-8 h-8 stroke-[1.5]" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="font-cinzel text-xl font-bold text-white tracking-wider">
                {selectedFilter === 'all' ? 'No Active Polls' : `No ${selectedFilter} polls found`}
              </h3>
              <p className="text-sm text-slate-400 font-sans">
                {isAdmin
                  ? 'Create a new voting poll to collect member votes.'
                  : 'Active voting sessions will appear here.'}
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00A884] hover:bg-[#009272] text-[#111B21] font-bold text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Create First Poll</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredPolls.map((poll) => {
              const hasUserVoted = poll.votedUserEmails?.includes(userEmail);
              
              const maxVotes = Math.max(...poll.options.map((o) => o.votes), 0);
              const totalPollVotes = poll.totalVotes || 0;
              const currentSelected = selectedOptionsMap[poll.id] || [];
              const showResults = !poll.isActive;

              return (
                <div
                  key={poll.id}
                  className="bg-[#0B141A] rounded-2xl border border-[#1F2C34] hover:border-[#00A884]/50 p-6 shadow-xl space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      {poll.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00A884]/20 text-[#00A884] text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00A884] animate-pulse" />
                          Live Voting (Open)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C5A880]/20 text-[#C5A880] text-xs font-bold border border-[#C5A880]/40">
                          <Trophy className="w-3.5 h-3.5 text-[#C5A880]" />
                          Voting Closed • Results Declared
                        </span>
                      )}

                      <span className="text-xs text-slate-500">
                        {new Date(poll.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white font-sans leading-snug">
                      {poll.question}
                    </h3>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-[#182229]">
                      <span>Host: {poll.createdBy?.name || 'Member'}</span>
                      {poll.isActive && (
                        <span className="text-amber-400/90 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>Secret Ballot</span>
                        </span>
                      )}
                    </div>

                    {/* Options */}
                    <div className="space-y-2 pt-2">
                      {poll.options.map((option) => {
                        const optionVotes = option.votes || 0;
                        const percentage = totalPollVotes > 0 ? Math.round((optionVotes / totalPollVotes) * 100) : 0;
                        const isSelected = currentSelected.includes(option.id);
                        const userVotedThis = option.voterEmails?.includes(userEmail);
                        const isLeader = maxVotes > 0 && optionVotes === maxVotes;

                        return (
                          <div
                            key={option.id}
                            onClick={() => {
                              if (poll.isActive && (!hasUserVoted || currentSelected.length > 0)) {
                                handleOptionSelect(poll, option.id);
                              }
                            }}
                            className={`relative p-3.5 rounded-xl border transition-all select-none flex items-center ${
                              poll.isActive && (!hasUserVoted || currentSelected.length > 0)
                                ? 'cursor-pointer hover:border-[#00A884]'
                                : 'cursor-default'
                            } ${
                              showResults
                                ? isLeader && totalPollVotes > 0
                                  ? 'bg-[#00A884]/15 border-[#00A884] text-white'
                                  : 'bg-[#111B21] border-[#222E35] text-slate-200'
                                : isSelected || (hasUserVoted && userVotedThis)
                                ? 'bg-[#00A884]/15 border-[#00A884] text-white'
                                : 'bg-[#111B21] border-[#222E35] text-slate-200'
                            }`}
                          >
                            {showResults && (
                              <div
                                className={`absolute left-0 top-0 bottom-0 rounded-xl transition-all duration-500 ${
                                  userVotedThis ? 'bg-[#00A884]/25 border-r-2 border-[#00A884]' : isLeader ? 'bg-[#C5A880]/20' : 'bg-slate-700/20'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            )}

                            <div className="relative z-10 flex items-center justify-between gap-3 w-full">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {poll.isActive ? (
                                  hasUserVoted && currentSelected.length === 0 ? (
                                    userVotedThis ? (
                                      <span className="shrink-0 w-5 h-5 rounded-full bg-[#00A884] text-[#111B21] flex items-center justify-center text-xs font-bold">
                                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                                      </span>
                                    ) : (
                                      <span className="shrink-0 w-5 h-5 rounded-full border border-slate-600" />
                                    )
                                  ) : (
                                    <div className="shrink-0 text-[#00A884]">
                                      {isSelected ? (
                                        <CheckCircle2 className="w-5 h-5 fill-[#00A884] text-[#111B21]" />
                                      ) : (
                                        <Circle className="w-5 h-5 text-slate-500" />
                                      )}
                                    </div>
                                  )
                                ) : (
                                  userVotedThis && (
                                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#00A884] text-[#111B21] flex items-center justify-center text-xs font-bold">
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </span>
                                  )
                                )}
                                <span className="text-sm font-medium">{option.text}</span>
                              </div>

                              {showResults ? (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isLeader && totalPollVotes > 0 && (
                                    <Crown className="w-3.5 h-3.5 text-[#C5A880] fill-[#C5A880]" />
                                  )}
                                  <span className="text-xs font-bold text-slate-200">{percentage}%</span>
                                  <span className="text-[11px] text-slate-500">({optionVotes})</span>
                                </div>
                              ) : (
                                hasUserVoted && userVotedThis && (
                                  <span className="text-xs text-[#00A884] font-medium shrink-0 bg-[#00A884]/15 px-2.5 py-1 rounded-md">
                                    Voted
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="pt-3 border-t border-[#182229] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-[#00A884]" />
                        <span>{totalPollVotes} Total Votes</span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleShare(poll)}
                          className="p-2 text-slate-400 hover:text-white rounded-lg border border-[#222E35] transition-colors cursor-pointer"
                          title="Share"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        {/* Admin Only: Reopen/Close and Delete Controls */}
                        {isAdmin && (
                          <>
                            {/* Reopen / Close Toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(poll.id, poll.isActive)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                                poll.isActive
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                  : 'bg-[#00A884]/20 text-[#00A884] border-[#00A884]/40 hover:bg-[#00A884]/30'
                              }`}
                              title={poll.isActive ? 'Close voting to reveal results' : 'Reopen voting'}
                            >
                              {poll.isActive ? (
                                <>
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>Close &amp; Declare Results</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3.5 h-3.5" />
                                  <span>Reopen Voting</span>
                                </>
                              )}
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleRequestDelete(poll)}
                              className="p-2 text-slate-400 hover:text-rose-400 rounded-lg border border-[#222E35] transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {poll.isActive && (
                      <div>
                        {hasUserVoted && currentSelected.length === 0 ? (
                          <button
                            type="button"
                            onClick={() => handleRetractVote(poll)}
                            disabled={votingInProgressId === poll.id}
                            className="w-full py-2.5 rounded-xl bg-[#111B21] hover:bg-[#202C33] border border-[#222E35] text-slate-300 text-xs font-semibold cursor-pointer"
                          >
                            Change My Vote
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCastVote(poll)}
                            disabled={currentSelected.length === 0 || votingInProgressId === poll.id}
                            className="w-full py-3 rounded-xl bg-[#00A884] hover:bg-[#009272] text-[#111B21] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-40"
                          >
                            {votingInProgressId === poll.id ? (
                              <span>Submitting...</span>
                            ) : (
                              <>
                                <Check className="w-4 h-4 stroke-[3]" />
                                <span>{hasUserVoted ? 'Update Vote' : 'Submit Ballot'}</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* WhatsApp-Style Create Poll Modal / Screen (Accessible ONLY for Admin) */}
      {isAdmin && (
        <CreatePollModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmitPoll={handleCreatePoll}
          userProfile={currentUser}
        />
      )}
    </div>
  );
};
