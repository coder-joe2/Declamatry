import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Mic,
  FileText,
  Zap,
  CheckCircle2,
  Circle,
  Check,
  Lock,
  Unlock,
  Trash2,
  Share2,
  Crown,
  Sparkles,
  Users,
  Award,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Flame
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MeetingVotingSession, UserProfile } from '../types';

interface MeetingSessionCardProps {
  session: MeetingVotingSession;
  currentUser: UserProfile;
  isAdmin: boolean;
  onVote: (sessionId: string, votesMap: Record<string, string>) => Promise<void>;
  onToggleStatus: (sessionId: string, isActive: boolean) => Promise<void>;
  onRequestDelete: (session: MeetingVotingSession) => void;
  onShare: (session: MeetingVotingSession) => void;
}

export const MeetingSessionCard: React.FC<MeetingSessionCardProps> = ({
  session,
  currentUser,
  isAdmin,
  onVote,
  onToggleStatus,
  onRequestDelete,
  onShare,
}) => {
  const userEmail = (currentUser.gmail || '').toLowerCase().trim();
  const hasUserVoted = session.votedUserEmails?.includes(userEmail);
  const showResults = !session.isActive;

  // Selected candidates map: { [categoryId]: candidateId }
  const [selectedMap, setSelectedMap] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    session.categories.forEach((cat) => {
      const userChoice = cat.candidates.find((c) => c.voterEmails?.includes(userEmail));
      if (userChoice) {
        initial[cat.id] = userChoice.id;
      }
    });
    return initial;
  });

  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [isChangingVote, setIsChangingVote] = useState(false);
  const [expandedBreakdown, setExpandedBreakdown] = useState<Record<string, boolean>>({});

  // Trigger celebration confetti when viewing newly closed session
  useEffect(() => {
    if (showResults) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#C5A880', '#00A884', '#FFD700', '#FFFFFF'],
        });
      } catch {
        // Safe fallback if confetti blocked
      }
    }
  }, [showResults]);

  const handleSelectCandidate = (categoryId: string, candidateId: string) => {
    if (!session.isActive) return;
    if (hasUserVoted && !isChangingVote) return;

    setSelectedMap((prev) => ({
      ...prev,
      [categoryId]: prev[categoryId] === candidateId ? '' : candidateId,
    }));
  };

  const handleCastMeetingVote = async () => {
    const chosenCategoryCount = Object.values(selectedMap).filter(Boolean).length;
    if (chosenCategoryCount === 0) return;

    setIsSubmittingVote(true);
    try {
      await onVote(session.id, selectedMap);
      setIsChangingVote(false);
    } catch (e) {
      console.error('Error casting meeting vote:', e);
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const getCategoryIcon = (iconName?: string) => {
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
        return <Award className="w-4 h-4 text-[#C5A880]" />;
    }
  };

  const toggleCategoryBreakdown = (catId: string) => {
    setExpandedBreakdown((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const totalCategories = session.categories.length;
  const selectedCount = Object.values(selectedMap).filter(Boolean).length;
  const isSelectionComplete = selectedCount === totalCategories && totalCategories > 0;

  return (
    <div
      className={`w-full rounded-3xl border transition-all duration-300 overflow-hidden shadow-2xl ${
        session.isActive
          ? 'bg-gradient-to-b from-[#0B141A] to-[#060D12] border-[#00A884]/40 shadow-[#00A884]/10'
          : 'bg-gradient-to-b from-[#0A1118] to-[#04080D] border-[#C5A880]/50 shadow-[#C5A880]/15'
      }`}
    >
      {/* Session Top Header Banner */}
      <div className="p-3.5 sm:p-6 border-b border-[#1F2C34] bg-gradient-to-r from-[#0B141A] via-[#111E26] to-[#0A192F]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {session.isActive ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[#00A884]/20 text-[#00A884] text-[10px] sm:text-xs font-bold border border-[#00A884]/40 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-[#00A884] animate-ping" />
                  Live Meeting Voting Session
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[#C5A880]/20 text-[#C5A880] text-[10px] sm:text-xs font-bold border border-[#C5A880]/40 shadow-sm font-cinzel">
                  <Trophy className="w-3.5 h-3.5 text-[#C5A880]" />
                  Voting Closed • Winners Declared
                </span>
              )}

              <span className="text-[10px] sm:text-[11px] text-slate-400">
                {new Date(session.meetingDate || session.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>

              {isAdmin && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  Admin
                </span>
              )}
            </div>

            <h3 className="text-sm sm:text-xl font-bold text-white font-cinzel tracking-wide leading-snug break-words">
              {session.title}
            </h3>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-400">
              <span className="truncate max-w-[160px] sm:max-w-none">Host: {session.createdBy?.name || 'Club Executive'}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[#00A884]">
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>{session.totalVoters || 0} Members Voted</span>
              </span>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => onShare(session)}
              className="p-2 sm:p-2.5 text-slate-300 hover:text-white rounded-xl bg-[#111B21] border border-[#222E35] active:scale-95 transition-all cursor-pointer"
              title="Share Meeting Session"
            >
              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => onToggleStatus(session.id, session.isActive)}
                  className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1.5 border transition-all active:scale-95 cursor-pointer ${
                    session.isActive
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                      : 'bg-[#00A884]/20 text-[#00A884] border-[#00A884]/50 hover:bg-[#00A884]/30'
                  }`}
                  title={session.isActive ? 'Close voting and declare winners' : 'Reopen voting session'}
                >
                  {session.isActive ? (
                    <>
                      <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span>Close &amp; Declare</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span>Reopen</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onRequestDelete(session)}
                  className="p-2 sm:p-2.5 text-slate-400 hover:text-rose-400 rounded-xl bg-[#111B21] border border-[#222E35] active:scale-95 transition-all cursor-pointer"
                  title="Delete Session"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Voting Progress Pill for Active Sessions */}
        {session.isActive && (!hasUserVoted || isChangingVote) && (
          <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[#081016] border border-[#1F2C34] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3">
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="w-2 h-2 rounded-full bg-[#00A884] animate-pulse shrink-0" />
              <span className="text-slate-300 font-medium">
                Your Ballot Progress:
              </span>
              <span className={`font-bold ${isSelectionComplete ? 'text-[#00A884]' : 'text-amber-400'}`}>
                {selectedCount} of {totalCategories} Roles Selected
              </span>
            </div>

            <span className="text-[10px] sm:text-[11px] text-slate-400">
              Select 1 nominee per category below
            </span>
          </div>
        )}

        {/* Voted Confirmation Notice */}
        {session.isActive && hasUserVoted && !isChangingVote && (
          <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[#00A884]/10 border border-[#00A884]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-xs text-[#00A884]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-semibold text-[11px] sm:text-xs">
                Your secret ballot is recorded! Results will be announced once closed.
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsChangingVote(true)}
              className="text-[11px] font-bold text-slate-300 hover:text-white bg-[#111B21] px-3 py-1.5 rounded-lg border border-[#222E35] cursor-pointer self-start sm:self-auto"
            >
              Change My Vote
            </button>
          </div>
        )}
      </div>

      {/* Categories & Nominees Grid */}
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {session.categories.map((cat, catIdx) => {
            const chosenCandidateId = selectedMap[cat.id];
            const isCategoryAnswered = Boolean(chosenCandidateId);
            const totalCatVotes = cat.candidates.reduce((sum, c) => sum + (c.votes || 0), 0);
            const maxCatVotes = Math.max(...cat.candidates.map((c) => c.votes || 0), 0);
            const isBreakdownOpen = expandedBreakdown[cat.id] || false;

            // Find Winner (highest votes)
            const winners = cat.candidates.filter(
              (c) => maxCatVotes > 0 && c.votes === maxCatVotes
            );

            return (
              <div
                key={cat.id}
                className={`rounded-2xl border transition-all p-4 space-y-3.5 ${
                  showResults
                    ? 'bg-[#0B141A] border-[#C5A880]/30 shadow-md'
                    : isCategoryAnswered
                    ? 'bg-[#0B141A] border-[#00A884]/40 shadow-sm'
                    : 'bg-[#0B141A] border-[#1F2C34]'
                }`}
              >
                {/* Category Header */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#182229]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#111B21] border border-[#222E35] flex items-center justify-center shrink-0">
                      {getCategoryIcon(cat.iconName)}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white font-cinzel">
                        {cat.title}
                      </h4>
                      {cat.subtitle && (
                        <p className="text-[10px] text-slate-400 truncate max-w-[200px] sm:max-w-xs">
                          {cat.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {session.isActive ? (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isCategoryAnswered
                          ? 'bg-[#00A884]/20 text-[#00A884] border border-[#00A884]/40'
                          : 'bg-[#182229] text-slate-400'
                      }`}
                    >
                      {isCategoryAnswered ? 'Selected' : 'Choose 1'}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-[#C5A880] flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-[#C5A880]" />
                      <span>{totalCatVotes} Votes</span>
                    </span>
                  )}
                </div>

                {/* WINNER SPOTLIGHT CARD (When Closed) */}
                {showResults && winners.length > 0 && totalCatVotes > 0 && (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-[#C5A880]/15 to-transparent border border-[#C5A880]/50 space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#C5A880] flex items-center gap-1 font-cinzel">
                        <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span>Winner • 1st Place</span>
                      </span>
                      <span className="text-xs font-bold text-amber-300">
                        {Math.round((winners[0].votes / totalCatVotes) * 100)}% ({winners[0].votes} votes)
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        {winners[0].photoUrl ? (
                          <img
                            src={winners[0].photoUrl}
                            alt={winners[0].name}
                            className="w-11 h-11 rounded-full object-cover border-2 border-amber-400 shadow-md"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-[#C5A880]/20 border-2 border-[#C5A880] text-[#C5A880] flex items-center justify-center font-bold text-sm shadow-md font-cinzel">
                            {winners[0].name ? winners[0].name.charAt(0).toUpperCase() : '🥇'}
                          </div>
                        )}
                        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-[#111B21] flex items-center justify-center text-[10px] font-bold shadow">
                          👑
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white leading-tight truncate">
                          {winners.map((w) => w.name).join(' & ')}
                        </p>
                        {(winners[0].roleOrTopic || winners[0].department) && (
                          <p className="text-[11px] text-amber-200/80 truncate mt-0.5">
                            {winners[0].roleOrTopic || `${winners[0].year ? `${winners[0].year} • ` : ''}${winners[0].department}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Candidates List */}
                <div className="space-y-2">
                  {cat.candidates.map((cand) => {
                    const isSelected = chosenCandidateId === cand.id;
                    const isUserVotedThis = cand.voterEmails?.includes(userEmail);
                    const candVotes = cand.votes || 0;
                    const percentage = totalCatVotes > 0 ? Math.round((candVotes / totalCatVotes) * 100) : 0;
                    const isWinner = maxCatVotes > 0 && candVotes === maxCatVotes;

                    return (
                      <div
                        key={cand.id}
                        onClick={() => handleSelectCandidate(cat.id, cand.id)}
                        className={`relative p-3 rounded-xl border transition-all select-none flex items-center ${
                          session.isActive && (!hasUserVoted || isChangingVote)
                            ? 'cursor-pointer hover:border-[#00A884] active:scale-[0.99]'
                            : 'cursor-default'
                        } ${
                          showResults
                            ? isWinner && totalCatVotes > 0
                              ? 'bg-[#00A884]/15 border-[#00A884] text-white'
                              : 'bg-[#111B21] border-[#222E35] text-slate-200'
                            : isSelected || (hasUserVoted && isUserVotedThis)
                            ? 'bg-[#00A884]/15 border-[#00A884] text-white shadow-sm'
                            : 'bg-[#111B21] border-[#222E35] text-slate-200'
                        }`}
                      >
                        {/* Progress Bar (Closed view) */}
                        {showResults && (
                          <div
                            className={`absolute left-0 top-0 bottom-0 rounded-xl transition-all duration-500 ${
                              isUserVotedThis
                                ? 'bg-[#00A884]/25 border-r-2 border-[#00A884]'
                                : isWinner && totalCatVotes > 0
                                ? 'bg-[#C5A880]/20'
                                : 'bg-slate-700/20'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        )}

                        <div className="relative z-10 flex items-center justify-between gap-2.5 w-full">
                          <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
                            {/* Selector icon */}
                            {session.isActive ? (
                              hasUserVoted && !isChangingVote ? (
                                isUserVotedThis ? (
                                  <span className="shrink-0 w-4.5 h-4.5 rounded-full bg-[#00A884] text-[#111B21] flex items-center justify-center text-[10px] font-bold shadow-sm">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  </span>
                                ) : (
                                  <span className="shrink-0 w-4.5 h-4.5 rounded-full border border-slate-600" />
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
                              isUserVotedThis && (
                                <span className="shrink-0 w-4.5 h-4.5 rounded-full bg-[#00A884] text-[#111B21] flex items-center justify-center text-[10px] font-bold">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </span>
                              )
                            )}

                            {/* Candidate Appointed User Photo */}
                            <div className="relative shrink-0">
                              {cand.photoUrl ? (
                                <img
                                  src={cand.photoUrl}
                                  alt={cand.name}
                                  className={`w-10 h-10 rounded-full object-cover border-2 shadow-sm transition-all ${
                                    isSelected || (hasUserVoted && isUserVotedThis)
                                      ? 'border-[#00A884] ring-2 ring-[#00A884]/30'
                                      : 'border-[#2A3942]'
                                  }`}
                                />
                              ) : (
                                <div
                                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border transition-colors ${
                                    isSelected || (hasUserVoted && isUserVotedThis)
                                      ? 'bg-[#00A884]/25 text-[#00A884] border-[#00A884]'
                                      : 'bg-[#111B21] text-[#C5A880] border-[#2A3942]'
                                  }`}
                                >
                                  {cand.name ? cand.name.charAt(0).toUpperCase() : '?'}
                                </div>
                              )}
                            </div>

                            {/* Candidate Name & Info */}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm font-bold text-white leading-tight truncate font-cinzel">
                                {cand.name}
                              </p>
                              {(cand.roleOrTopic || cand.department) && (
                                <p className="text-[10px] sm:text-[11px] text-slate-400 truncate mt-0.5">
                                  {cand.roleOrTopic ? (
                                    <span>{cand.roleOrTopic}</span>
                                  ) : (
                                    <span>{cand.year ? `${cand.year} • ` : ''}{cand.department}</span>
                                  )}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Result Percentage (Closed view) */}
                          {showResults ? (
                            <div className="flex items-center gap-1 shrink-0 text-right">
                              {isWinner && totalCatVotes > 0 && (
                                <Crown className="w-3.5 h-3.5 text-[#C5A880] fill-[#C5A880]" />
                              )}
                              <span className="text-xs font-bold text-slate-200">
                                {percentage}%
                              </span>
                              <span className="text-[10px] text-slate-500">
                                ({candVotes})
                              </span>
                            </div>
                          ) : (
                            hasUserVoted && isUserVotedThis && !isChangingVote && (
                              <span className="text-[10px] text-[#00A884] font-semibold shrink-0 bg-[#00A884]/15 px-2 py-0.5 rounded border border-[#00A884]/30">
                                Your Choice
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Voter details collapse button (Closed view) */}
                {showResults && totalCatVotes > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleCategoryBreakdown(cat.id)}
                    className="w-full pt-1 text-[10px] text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>{isBreakdownOpen ? 'Hide' : 'View'} full tally</span>
                    {isBreakdownOpen ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                )}

                {showResults && isBreakdownOpen && (
                  <div className="p-2.5 bg-[#050B10] rounded-xl border border-[#1F2C34] text-[10px] space-y-1 animate-fadeIn">
                    <p className="font-semibold text-slate-300">Vote Breakdown:</p>
                    {cat.candidates.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-slate-400">
                        <span className="truncate pr-2">{c.name}</span>
                        <span className="font-bold text-[#00A884]">
                          {c.votes || 0} votes
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Big Submit Button for Live Session */}
        {session.isActive && (!hasUserVoted || isChangingVote) && (
          <div className="pt-2">
            <button
              type="button"
              onClick={handleCastMeetingVote}
              disabled={selectedCount === 0 || isSubmittingVote}
              className="w-full py-4 rounded-2xl bg-[#00A884] hover:bg-[#009272] text-[#111B21] font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-[#00A884]/25 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-40 min-h-[48px]"
            >
              {isSubmittingVote ? (
                <span>Submitting Your Ballot...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>
                    {hasUserVoted
                      ? `Update Meeting Ballot (${selectedCount}/${totalCategories} Selected)`
                      : `Submit Meeting Ballot (${selectedCount}/${totalCategories} Selected)`}
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
