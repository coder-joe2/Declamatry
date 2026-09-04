import React, { useState, useEffect } from 'react';
import { 
  Vote, 
  Plus, 
  Sparkles, 
  CheckCircle2, 
  Users, 
  Trash2, 
  Check, 
  Lock, 
  Unlock, 
  Trophy, 
  Share2, 
  ShieldCheck,
  Circle,
  Crown,
  Layers,
  Mic,
  Zap,
  FileText
} from 'lucide-react';
import { UserProfile, Poll, MeetingVotingSession } from '../../types';
import { CreatePollModal } from '../CreatePollModal';
import { CreateMeetingSessionModal } from '../CreateMeetingSessionModal';
import { MeetingSessionCard } from '../MeetingSessionCard';
import { 
  subscribeToPolls, 
  createPollInFirebase, 
  submitVoteInFirebase, 
  togglePollStatus, 
  deletePoll,
  subscribeToMeetingSessions,
  createMeetingSessionInFirebase,
  submitMeetingVoteInFirebase,
  toggleMeetingSessionStatus,
  deleteMeetingSession,
  sendAppMessage
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

  // States for Meeting Sessions & Polls
  const [meetingSessions, setMeetingSessions] = useState<MeetingVotingSession[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);

  // Modals
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState<boolean>(false);
  const [isCustomPollModalOpen, setIsCustomPollModalOpen] = useState<boolean>(false);
  
  // Deletions
  const [sessionToDelete, setSessionToDelete] = useState<MeetingVotingSession | null>(null);
  const [pollToDelete, setPollToDelete] = useState<Poll | null>(null);

  // Filter
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'meetings' | 'active' | 'ended' | 'custom'>('all');
  
  // Single poll voting interaction state
  const [selectedOptionsMap, setSelectedOptionsMap] = useState<Record<string, string[]>>({});
  const [expandedVotersPollId, setExpandedVotersPollId] = useState<string | null>(null);
  const [votingInProgressId, setVotingInProgressId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Subscribe to real-time meeting sessions & polls
  useEffect(() => {
    const unsubMeetings = subscribeToMeetingSessions((updatedSessions) => {
      setMeetingSessions(updatedSessions);
    });

    const unsubPolls = subscribeToPolls((updatedPolls) => {
      setPolls(updatedPolls);
    });

    return () => {
      unsubMeetings();
      unsubPolls();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  /* ========================================================================= */
  /* MEETING VOTING SESSION HANDLERS                                           */
  /* ========================================================================= */

  const handleCreateMeetingSession = async (sessionData: Omit<MeetingVotingSession, 'id'>) => {
    if (!isAdmin) {
      showToast('Admin privilege required to launch voting sessions.');
      return;
    }
    const result = await createMeetingSessionInFirebase(sessionData);
    if (result.success && result.session) {
      setMeetingSessions((prev) => [result.session, ...prev.filter((s) => s.id !== result.session.id)]);
      showToast('🚀 4-Role Meeting Voting Session Launched!');

      // PUBLIC BROADCAST: Send message to everyone (including admin) when a new poll starts
      sendAppMessage({
        type: 'new_poll',
        title: 'New Poll Started',
        message: 'New poll started so kindly voting',
        targetEmail: 'public',
        isBroadcast: true,
        createdAt: new Date().toISOString(),
        createdBy: {
          name: userProfile?.name || 'Admin',
          gmail: userProfile?.gmail || '',
        },
        readBy: [],
      }).catch((err) => console.warn('Broadcast poll message error:', err));
    }
  };

  const handleVoteMeetingSession = async (sessionId: string, votesMap: Record<string, string>) => {
    const email = userEmail || 'member@declamates.club';
    const result = await submitMeetingVoteInFirebase(sessionId, votesMap, email);
    if (result.updatedSession) {
      setMeetingSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? result.updatedSession! : s))
      );
      showToast('Secret ballot recorded across all selected roles!');
    }
  };

  const handleToggleMeetingSessionStatus = async (sessionId: string, currentStatus: boolean) => {
    if (!isAdmin) {
      showToast('Only Admins can open or close sessions.');
      return;
    }
    const nextStatus = !currentStatus;
    setMeetingSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, isActive: nextStatus } : s))
    );
    await toggleMeetingSessionStatus(sessionId, nextStatus);
    showToast(nextStatus ? 'Meeting voting reopened!' : '🏆 Voting closed & winners declared!');
  };

  const handleConfirmDeleteSession = async () => {
    if (!sessionToDelete || !isAdmin) return;
    const targetId = sessionToDelete.id;
    setMeetingSessions((prev) => prev.filter((s) => s.id !== targetId));
    setSessionToDelete(null);
    await deleteMeetingSession(targetId);
    showToast('Meeting voting session deleted.');
  };

  const handleShareMeetingSession = async (session: MeetingVotingSession) => {
    const text = `🗳️ Declamate's Society Meeting Voting: "${session.title}"\nCast your ballot for Key Note Speakers, Evaluators & Role Players!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: session.title,
          text,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      showToast('Meeting voting link copied!');
    } catch {
      showToast('Link copied!');
    }
  };

  /* ========================================================================= */
  /* CUSTOM SINGLE POLL HANDLERS                                               */
  /* ========================================================================= */

  const handleCreateCustomPoll = async (pollData: Omit<Poll, 'id'>) => {
    if (!isAdmin) {
      showToast('Admin privilege required to create polls.');
      return;
    }
    const result = await createPollInFirebase(pollData);
    if (result.success && result.poll) {
      setPolls((prev) => [result.poll, ...prev.filter((p) => p.id !== result.poll.id)]);
      showToast('Custom poll published!');

      // PUBLIC BROADCAST: Send message to everyone (including admin)
      sendAppMessage({
        type: 'new_poll',
        title: 'New Poll Started',
        message: 'New poll started so kindly voting',
        targetEmail: 'public',
        isBroadcast: true,
        createdAt: new Date().toISOString(),
        createdBy: {
          name: userProfile?.name || 'Admin',
          gmail: userProfile?.gmail || '',
        },
        readBy: [],
      }).catch((err) => console.warn('Broadcast custom poll message error:', err));
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

  const handleTogglePollStatus = async (pollId: string, currentStatus: boolean) => {
    if (!isAdmin) {
      showToast('Only Admins can open or close voting sessions.');
      return;
    }
    const nextStatus = !currentStatus;
    setPolls((prevPolls) =>
      prevPolls.map((p) => (p.id === pollId ? { ...p, isActive: nextStatus } : p))
    );
    await togglePollStatus(pollId, nextStatus);
    showToast(nextStatus ? 'Voting session reopened!' : 'Voting closed & results revealed!');
  };

  const handleConfirmDeletePoll = async () => {
    if (!pollToDelete || !isAdmin) return;
    const targetId = pollToDelete.id;
    setPolls((prev) => prev.filter((p) => p.id !== targetId));
    setPollToDelete(null);
    await deletePoll(targetId);
    showToast('Poll deleted successfully.');
  };

  const handleSharePoll = async (poll: Poll) => {
    const text = `🗳️ Declamate's Society Voting: "${poll.question}"`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: poll.question,
          text,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      showToast('Poll link copied!');
    } catch {
      showToast('Link copied!');
    }
  };

  /* ========================================================================= */
  /* FILTERING LOGIC                                                           */
  /* ========================================================================= */

  const activeMeetings = meetingSessions.filter((s) => s.isActive);
  const closedMeetings = meetingSessions.filter((s) => !s.isActive);
  const activePolls = polls.filter((p) => p.isActive);
  const closedPolls = polls.filter((p) => !p.isActive);

  const totalActive = activeMeetings.length + activePolls.length;

  const showMeetingSessions = selectedFilter === 'all' || selectedFilter === 'meetings' || (selectedFilter === 'active' && activeMeetings.length > 0) || (selectedFilter === 'ended' && closedMeetings.length > 0);
  const showCustomPolls = selectedFilter === 'all' || selectedFilter === 'custom' || (selectedFilter === 'active' && activePolls.length > 0) || (selectedFilter === 'ended' && closedPolls.length > 0);

  const filteredMeetings = meetingSessions.filter((s) => {
    if (selectedFilter === 'active') return s.isActive;
    if (selectedFilter === 'ended') return !s.isActive;
    if (selectedFilter === 'meetings') return true;
    if (selectedFilter === 'custom') return false;
    return true;
  });

  const filteredCustomPolls = polls.filter((p) => {
    if (selectedFilter === 'active') return p.isActive;
    if (selectedFilter === 'ended') return !p.isActive;
    if (selectedFilter === 'custom') return true;
    if (selectedFilter === 'meetings') return false;
    return true;
  });

  const hasAnyItems = filteredMeetings.length > 0 || filteredCustomPolls.length > 0;

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden text-slate-100 selection:bg-[#C5A880] selection:text-[#0A192F] space-y-4 sm:space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 sm:top-24 left-1/2 -translate-x-1/2 z-50 bg-[#00A884] text-[#111B21] px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full font-bold shadow-2xl flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap border border-[#25D366] animate-bounce max-w-[90vw] truncate">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* In-App Delete Confirmation Modal for Meeting Session */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0B141A] border border-[#2A3942] rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Delete Meeting Voting Session?</h3>
              <p className="text-xs text-slate-400 break-words">
                "{sessionToDelete.title}" and all its candidate votes will be permanently deleted.
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#111B21] border border-[#222E35] text-slate-300 hover:text-white text-xs font-semibold cursor-pointer active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSession}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal for Custom Poll */}
      {pollToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0B141A] border border-[#2A3942] rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Delete Voting Poll?</h3>
              <p className="text-xs text-slate-400 break-words">
                "{pollToDelete.question}" will be permanently removed.
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
                onClick={handleConfirmDeletePoll}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg shadow-rose-600/30 active:scale-95 transition-all"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HEADER BANNER & ADMIN CREATION ACTIONS                                    */}
      {/* ========================================================================= */}
      <div className="w-full min-w-0 max-w-full bg-gradient-to-br from-[#02050B] via-[#0A192F] to-[#040A17] rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 md:p-7 border border-[#C5A880]/40 shadow-2xl space-y-3 sm:space-y-4 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 min-w-0">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-[#C5A880]/20 text-[#C5A880] text-[10px] sm:text-xs font-semibold uppercase tracking-wider border border-[#C5A880]/40 font-cinzel">
                <Vote className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="truncate">Declamate’s Polling Center</span>
              </span>

              {isAdmin && (
                <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] sm:text-xs font-bold border border-amber-500/40 shrink-0">
                  <ShieldCheck className="w-3 h-3 shrink-0" />
                  <span>Admin</span>
                </span>
              )}

              {totalActive > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[#00A884]/20 text-[#00A884] text-[10px] sm:text-xs font-bold border border-[#00A884]/40 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00A884] animate-ping" />
                  <span>{totalActive} Live {totalActive === 1 ? 'Session' : 'Sessions'}</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-[#111B21] text-slate-400 text-[10px] sm:text-xs border border-[#1E2E48] shrink-0">
                  0 Active
                </span>
              )}
            </div>

            <h2 className="text-base sm:text-2xl md:text-3xl font-bold font-cinzel text-white tracking-wide break-words leading-snug">
              Official Meeting Voting &amp; Secret Ballots
            </h2>
            <p className="text-slate-300 text-[11px] sm:text-sm leading-relaxed max-w-2xl break-words">
              Vote for <span className="text-[#00A884] font-semibold">1. Best Role Players</span>, <span className="text-[#C5A880] font-semibold">2. Best Key Note Speakers</span>, <span className="text-sky-400 font-semibold">3. Best Evaluators</span>, and <span className="text-yellow-400 font-semibold">4. Best Quick Think Speaker</span>. Results remain confidential until declared by the admin.
            </p>
          </div>

          {/* ADMIN PRIMARY ACTION BUTTONS - Mobile Full Width Stack */}
          {isAdmin && (
            <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 w-full sm:w-auto min-w-0">
              {/* PRIMARY 1-CLICK QUICK SESSION BUTTON */}
              <button
                type="button"
                id="start-meeting-voting-btn"
                onClick={() => setIsMeetingModalOpen(true)}
                className="w-full sm:w-auto py-2.5 sm:py-3 px-3.5 sm:px-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#00A884] to-[#009272] hover:brightness-110 text-[#111B21] font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-[#00A884]/25 active:scale-95 transition-all cursor-pointer min-h-[42px]"
              >
                <Sparkles className="w-4 h-4 text-[#111B21] shrink-0" />
                <span className="font-cinzel text-center leading-tight">+ Start Poll(4 Roles)</span>
              </button>

              {/* SECONDARY CUSTOM POLL BUTTON */}
              <button
                type="button"
                id="add-custom-poll-btn"
                onClick={() => setIsCustomPollModalOpen(true)}
                className="w-full sm:w-auto py-2 sm:py-2.5 px-3.5 sm:px-4 rounded-xl bg-[#111B21] hover:bg-[#182630] text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#2A3942] active:scale-95 transition-all cursor-pointer min-h-[38px]"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Custom Poll</span>
              </button>
            </div>
          )}
        </div>

        {/* Filter Navigation Pills - Smooth horizontal swipe on mobile */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pt-2 border-t border-[#182229] scrollbar-none no-scrollbar -mx-1 px-1">
          {[
            { id: 'all', label: 'All Sessions', count: meetingSessions.length + polls.length },
            { id: 'meetings', label: 'Meeting Voting (4 Roles)', count: meetingSessions.length },
            { id: 'active', label: 'Live Active', count: totalActive },
            { id: 'ended', label: 'Closed & Winners', count: closedMeetings.length + closedPolls.length },
            { id: 'custom', label: 'Custom Polls', count: polls.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id as any)}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                selectedFilter === tab.id
                  ? 'bg-[#00A884] text-[#111B21] font-bold shadow-md shadow-[#00A884]/20'
                  : 'bg-[#0B141A] text-slate-300 hover:bg-[#111B21] border border-[#1F2C34]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] ${
                selectedFilter === tab.id ? 'bg-[#111B21] text-[#00A884]' : 'bg-[#182229] text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN CONTENT FEED: 4-ROLE MEETING SESSIONS & CUSTOM POLLS                 */}
      {/* ========================================================================= */}
      {!hasAnyItems ? (
        <div className="w-full bg-[#0B141A] rounded-3xl border border-[#1F2C34] p-10 sm:p-14 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-[#111B21] border border-[#00A884]/40 text-[#00A884] flex items-center justify-center mx-auto shadow-lg">
            <Vote className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-cinzel text-lg sm:text-xl font-bold text-white tracking-wider">
              {selectedFilter === 'all' ? 'No Active Voting Sessions' : `No ${selectedFilter} sessions found`}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              {isAdmin
                ? 'Tap "+ Start Meeting Voting (4 Roles)" to launch the 4 club categories in one click.'
                : 'Active club voting sessions created by admins will appear here.'}
            </p>
          </div>

          {isAdmin && (
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsMeetingModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00A884] text-[#111B21] font-bold text-xs uppercase tracking-wider active:scale-95 transition-transform cursor-pointer shadow-lg"
              >
                <Sparkles className="w-4 h-4 text-[#111B21]" />
                <span>+ Start Poll(4 players)</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. MEETING SESSIONS (The 4 Official Roles) */}
          {showMeetingSessions && filteredMeetings.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00A884]" />
                <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider font-cinzel">
                  Club Meeting Voting Sessions (4 Roles)
                </h3>
              </div>

              <div className="space-y-6">
                {filteredMeetings.map((session) => (
                  <MeetingSessionCard
                    key={session.id}
                    session={session}
                    currentUser={currentUser}
                    isAdmin={isAdmin}
                    onVote={handleVoteMeetingSession}
                    onToggleStatus={handleToggleMeetingSessionStatus}
                    onRequestDelete={setSessionToDelete}
                    onShare={handleShareMeetingSession}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 2. CUSTOM SINGLE POLLS */}
          {showCustomPolls && filteredCustomPolls.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 px-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C5A880]" />
                <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider font-cinzel">
                  Individual &amp; Custom Polls
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {filteredCustomPolls.map((poll) => {
                  const hasUserVoted = poll.votedUserEmails?.includes(userEmail);
                  const maxVotes = Math.max(...poll.options.map((o) => o.votes), 0);
                  const totalPollVotes = poll.totalVotes || 0;
                  const currentSelected = selectedOptionsMap[poll.id] || [];
                  const showResults = !poll.isActive;
                  const isVotersExpanded = expandedVotersPollId === poll.id;

                  return (
                    <div
                      key={poll.id}
                      className="bg-[#0B141A] rounded-2xl border border-[#1F2C34] hover:border-[#00A884]/40 p-4 sm:p-5 shadow-xl space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          {poll.isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00A884]/20 text-[#00A884] text-[11px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#00A884] animate-pulse" />
                              Live Poll
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#C5A880]/20 text-[#C5A880] text-[11px] font-bold border border-[#C5A880]/40">
                              <Trophy className="w-3 h-3 text-[#C5A880]" />
                              Poll Closed • Results Declared
                            </span>
                          )}

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

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-[#182229]">
                          <span>Host: {poll.createdBy?.name || 'Member'}</span>
                          {poll.isActive && (
                            <span className="text-amber-400/90 flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              <span>Secret Ballot</span>
                            </span>
                          )}
                        </div>

                        {/* Options */}
                        <div className="space-y-2 pt-1">
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
                                className={`relative p-3 rounded-xl border transition-all select-none flex items-center ${
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
                                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                    {poll.isActive ? (
                                      hasUserVoted && currentSelected.length === 0 ? (
                                        userVotedThis ? (
                                          <span className="shrink-0 w-4 h-4 rounded-full bg-[#00A884] text-[#111B21] flex items-center justify-center text-[10px] font-bold">
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
                                    {option.photoUrl ? (
                                      <img
                                        src={option.photoUrl}
                                        alt={option.text}
                                        className="w-7 h-7 rounded-full object-cover border border-[#00A884] shrink-0"
                                      />
                                    ) : null}
                                    <span className="text-xs font-medium">{option.text}</span>
                                  </div>

                                  {showResults ? (
                                    <div className="flex items-center gap-1 shrink-0">
                                      {isLeader && totalPollVotes > 0 && (
                                        <Crown className="w-3.5 h-3.5 text-[#C5A880] fill-[#C5A880]" />
                                      )}
                                      <span className="text-xs font-bold text-slate-200">{percentage}%</span>
                                      <span className="text-[10px] text-slate-500">({optionVotes})</span>
                                    </div>
                                  ) : (
                                    hasUserVoted && userVotedThis && (
                                      <span className="text-[10px] text-[#00A884] font-medium shrink-0 bg-[#00A884]/15 px-2 py-0.5 rounded">
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

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-[#182229] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-[#00A884]" />
                            <span>{totalPollVotes} Votes</span>
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSharePoll(poll)}
                              className="p-2 text-slate-400 hover:text-white rounded-lg border border-[#222E35] transition-colors cursor-pointer"
                              title="Share"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>

                            {isAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleTogglePollStatus(poll.id, poll.isActive)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                                    poll.isActive
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                      : 'bg-[#00A884]/20 text-[#00A884] border-[#00A884]/40'
                                  }`}
                                >
                                  {poll.isActive ? (
                                    <>
                                      <Lock className="w-3 h-3" />
                                      <span>Close</span>
                                    </>
                                  ) : (
                                    <>
                                      <Unlock className="w-3 h-3" />
                                      <span>Reopen</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setPollToDelete(poll)}
                                  className="p-2 text-slate-400 hover:text-rose-400 rounded-lg border border-[#222E35] cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
                                className="w-full py-2 rounded-xl bg-[#111B21] border border-[#222E35] text-slate-300 text-xs font-semibold cursor-pointer"
                              >
                                Change My Vote
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleCastVote(poll)}
                                disabled={currentSelected.length === 0 || votingInProgressId === poll.id}
                                className="w-full py-2.5 rounded-xl bg-[#00A884] hover:bg-[#009272] text-[#111B21] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-40"
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
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4-Role Meeting Voting Creation Modal */}
      {isAdmin && (
        <CreateMeetingSessionModal
          isOpen={isMeetingModalOpen}
          onClose={() => setIsMeetingModalOpen(false)}
          onSubmitSession={handleCreateMeetingSession}
          userProfile={currentUser}
        />
      )}

      {/* Custom Single Poll Modal */}
      {isAdmin && (
        <CreatePollModal
          isOpen={isCustomPollModalOpen}
          onClose={() => setIsCustomPollModalOpen(false)}
          onSubmitPoll={handleCreateCustomPoll}
          userProfile={currentUser}
        />
      )}
    </div>
  );
};
