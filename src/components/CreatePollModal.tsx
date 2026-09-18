import React, { useState, useRef, useEffect } from 'react';
import { X, Smile, Equal, Plus, Trash2, Check, Sparkles, Send } from 'lucide-react';
import { UserProfile, Poll } from '../types';

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitPoll: (pollData: Omit<Poll, 'id'>) => Promise<void>;
  userProfile: UserProfile;
}

const COMMON_EMOJIS = [
  '😊', '👍', '🏆', '🎤', '🌟', '👏', '🔥', '🎯', 
  '💯', '✨', '💡', '❤️', '🙌', '🚀', '🥇', '🥈', 
  '🥉', '📚', '🤝', '🎉', '🤩', '💪', '👑', '⭐'
];

export const CreatePollModal: React.FC<CreatePollModalProps> = ({
  isOpen,
  onClose,
  onSubmitPoll,
  userProfile,
}) => {
  const [question, setQuestion] = useState<string>('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const allowMultipleAnswers = false;
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Emoji picker state
  const [activeEmojiTarget, setActiveEmojiTarget] = useState<'question' | number | null>(null);

  const questionInputRef = useRef<HTMLInputElement>(null);
  const optionInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll on mobile when modal is open
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        if (questionInputRef.current) questionInputRef.current.focus();
      }, 150);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
      setTimeout(() => {
        const nextIdx = options.length;
        if (optionInputRefs.current[nextIdx]) {
          optionInputRefs.current[nextIdx]?.focus();
        }
      }, 50);
    }
  };

  const handleRemoveOption = (indexToRemove: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, idx) => idx !== indexToRemove));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);

    // If typing in the last option and it's not empty, auto-add a new blank option (WhatsApp behavior)
    if (index === options.length - 1 && value.trim() !== '' && options.length < 10) {
      setOptions([...newOptions, '']);
    }
  };

  const insertEmoji = (emoji: string) => {
    if (activeEmojiTarget === 'question') {
      setQuestion((prev) => prev + emoji);
    } else if (typeof activeEmojiTarget === 'number') {
      const newOptions = [...options];
      newOptions[activeEmojiTarget] = (newOptions[activeEmojiTarget] || '') + emoji;
      setOptions(newOptions);
    }
    setActiveEmojiTarget(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!question.trim()) {
      setErrorMessage('Please enter a question for the poll');
      if (questionInputRef.current) questionInputRef.current.focus();
      return;
    }

    const validOptions = options.map((opt) => opt.trim()).filter((opt) => opt.length > 0);

    if (validOptions.length < 2) {
      setErrorMessage('Please provide at least 2 voting options');
      return;
    }

    setIsSubmitting(true);

    try {
      const pollPayload: Omit<Poll, 'id'> = {
        question: question.trim(),
        options: validOptions.map((optText, idx) => ({
          id: 'opt_' + idx + '_' + Math.random().toString(36).substring(2, 6),
          text: optText,
          votes: 0,
          voterEmails: [],
        })),
        allowMultipleAnswers,
        category: '',
        createdBy: {
          name: userProfile.name.trim() || 'Club Member',
          gmail: userProfile.gmail.trim() || 'member@declamates.club',
          photoUrl: userProfile.photoUrl || '',
          department: userProfile.department || '',
        },
        createdAt: new Date().toISOString(),
        isActive: true,
        totalVotes: 0,
        votedUserEmails: [],
      };

      await onSubmitPoll(pollPayload);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create voting poll';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      id="create-poll-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Modal Container - Fullscreen on mobile, modal on desktop */}
      <div 
        id="create-poll-dialog"
        className="w-full sm:max-w-lg bg-[#06111F] border-t sm:border border-[#BFA373]/30 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[94vh] sm:h-auto sm:max-h-[90vh] text-slate-100 transition-all duration-300"
      >
        {/* Mobile Pull-Down Indicator (shown on mobile only) */}
        <div className="w-full sm:hidden pt-2.5 pb-1 flex justify-center bg-[#06111F]">
          <div className="w-12 h-1 rounded-full bg-slate-600/60" />
        </div>

        {/* Header (WhatsApp style: Close X icon + Create poll text) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 bg-[#06111F] border-b border-[#202C33] select-none shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-2 -ml-1 text-slate-300 hover:text-white rounded-full active:bg-[#202C33] hover:bg-[#202C33] transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <h2 className="text-lg sm:text-xl font-medium text-slate-100 font-sans tracking-tight">
              Create poll
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-[#BFA373]/20 text-[#BFA373] border border-[#BFA373]/40 font-cinzel">
              Declamate's
            </span>
          </div>
        </div>

        {/* Form Body - Touch optimized scrolling */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
          {errorMessage && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/40 text-rose-300 rounded-xl text-xs sm:text-sm">
              {errorMessage}
            </div>
          )}

          {/* Section: Question (Matches WhatsApp Screenshot) */}
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg font-medium text-slate-100 font-sans">
              Question
            </h3>
            
            <div className="relative group">
              <div className="flex items-center justify-between pb-1.5 border-b-2 border-[#BFA373] transition-colors focus-within:border-[#BFA373]">
                <input
                  ref={questionInputRef}
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask question"
                  className="w-full bg-transparent text-slate-100 placeholder:text-slate-500 text-sm sm:text-base focus:outline-none pr-3 py-1.5"
                />
                <button
                  type="button"
                  onClick={() =>
                    setActiveEmojiTarget(activeEmojiTarget === 'question' ? null : 'question')
                  }
                  className="p-2 text-slate-400 hover:text-[#BFA373] hover:bg-[#202C33] rounded-full transition-colors cursor-pointer shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
                  title="Add emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Emoji Popover for Question */}
              {activeEmojiTarget === 'question' && (
                <div className="absolute right-0 top-full mt-2 z-30 bg-[#202C33] border border-[#BFA373]/30 p-2.5 rounded-2xl shadow-2xl w-64 max-w-[calc(100vw-32px)] grid grid-cols-6 gap-1 animate-fadeIn">
                  {COMMON_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="p-2 text-base hover:bg-[#BFA373]/30 rounded-lg transition-transform hover:scale-125 flex items-center justify-center cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section: Options (Matches WhatsApp Screenshot) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-medium text-slate-100 font-sans">
                Options
              </h3>
              <span className="text-xs text-slate-400">
                {options.filter((o) => o.trim().length > 0).length} of {options.length} filled
              </span>
            </div>

            <div className="space-y-3.5">
              {options.map((option, index) => (
                <div key={index} className="relative group flex items-center gap-2">
                  <div className="flex-1 flex items-center justify-between pb-1 border-b border-[#374248] focus-within:border-[#BFA373] transition-colors min-h-[44px]">
                    <input
                      ref={(el) => (optionInputRefs.current[index] = el)}
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder="Add text"
                      className="w-full bg-transparent text-slate-100 placeholder:text-slate-500 text-sm sm:text-base focus:outline-none pr-2 py-1.5"
                    />

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Emoji Icon for Option */}
                      <button
                        type="button"
                        onClick={() =>
                          setActiveEmojiTarget(activeEmojiTarget === index ? null : index)
                        }
                        className="p-1.5 text-slate-400 hover:text-[#BFA373] active:bg-[#202C33] rounded-full transition-colors cursor-pointer"
                        title="Add emoji"
                      >
                        <Smile className="w-5 h-5" />
                      </button>

                      {/* Drag / Equal icon indicator */}
                      <div className="p-1.5 text-slate-500 cursor-grab select-none">
                        <Equal className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Remove button if more than 2 options */}
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="p-2 text-slate-500 hover:text-rose-400 active:bg-[#202C33] rounded-full transition-colors cursor-pointer shrink-0"
                      title="Remove option"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Quick Emoji Popover for this option */}
                  {activeEmojiTarget === index && (
                    <div className="absolute right-8 top-full mt-2 z-30 bg-[#202C33] border border-[#BFA373]/30 p-2.5 rounded-2xl shadow-2xl w-64 max-w-[calc(100vw-48px)] grid grid-cols-6 gap-1 animate-fadeIn">
                      {COMMON_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => insertEmoji(emoji)}
                          className="p-2 text-base hover:bg-[#BFA373]/30 rounded-lg transition-transform hover:scale-125 flex items-center justify-center cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Explicit Add Option Button */}
            {options.length < 10 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="inline-flex items-center gap-1.5 text-xs text-[#BFA373] hover:text-[#BFA373] font-medium py-2 px-3 rounded-xl hover:bg-[#202C33] active:bg-[#202C33] transition-colors cursor-pointer mt-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add another option</span>
              </button>
            )}
          </div>

          {/* User Creator Preview */}
          <div className="bg-[#0A1014] p-3 rounded-xl border border-[#202C33] flex items-center gap-2.5 text-xs text-slate-300">
            {userProfile.photoUrl ? (
              <img
                src={userProfile.photoUrl}
                alt={userProfile.name}
                className="w-6 h-6 rounded-full object-cover border border-[#BFA373]"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[#202C33] text-[#BFA373] flex items-center justify-center font-bold">
                {userProfile.name ? userProfile.name[0].toUpperCase() : 'M'}
              </div>
            )}
            <span className="truncate">
              Posting as: <strong className="text-white">{userProfile.name || 'Club Member'}</strong>
            </span>
          </div>

          {/* Bottom spacer for mobile safe area */}
          <div className="h-6 sm:hidden" />
        </form>

        {/* Sticky Mobile/Desktop Footer */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-[#06111F] border-t border-[#202C33] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white active:bg-[#202C33] rounded-xl transition-colors cursor-pointer min-h-[44px]"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3 bg-[#BFA373] hover:bg-[#BFA373] active:scale-95 text-[#06111F] font-bold rounded-2xl shadow-lg shadow-[#BFA373]/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-[#06111F] border-t-transparent rounded-full animate-spin" />
                <span>Starting Poll...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 fill-current" />
                <span>Start Voting</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
