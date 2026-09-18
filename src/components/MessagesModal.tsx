import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Vote, 
  CheckCheck, 
  Trash2, 
  Clock, 
  MessageSquare, 
  Bell, 
  Mic, 
  Award,
  Radio
} from 'lucide-react';
import { AppMessage, UserProfile } from '../types';
import { markMessageAsRead, markAllMessagesAsRead, deleteAppMessage } from '../firebase';

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: AppMessage[];
  userProfile: UserProfile;
  onDeleteMessage?: (msgId: string) => void;
  onClearAllMessages?: () => void;
}

export const MessagesModal: React.FC<MessagesModalProps> = ({
  isOpen,
  onClose,
  messages,
  userProfile,
  onDeleteMessage,
  onClearAllMessages,
}) => {
  const userEmail = (userProfile.gmail || '').trim().toLowerCase();

  // Maintain local state for instantaneous (0ms) feedback when deleting or marking read
  const [localMessages, setLocalMessages] = useState<AppMessage[]>(messages);

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  if (!isOpen) return null;
  
  const unreadMessages = localMessages.filter(
    (m) => !m.readBy?.map((e) => e.toLowerCase()).includes(userEmail)
  );

  const handleMarkAllRead = async () => {
    if (unreadMessages.length === 0) return;
    const ids = unreadMessages.map((m) => m.id);
    // Optimistically mark as read in local state
    setLocalMessages((prev) =>
      prev.map((m) => ({
        ...m,
        readBy: Array.from(new Set([...(m.readBy || []), userEmail])),
      }))
    );
    await markAllMessagesAsRead(userEmail, ids);
  };

  const handleMessageClick = async (msg: AppMessage) => {
    const isRead = msg.readBy?.map((e) => e.toLowerCase()).includes(userEmail);
    if (!isRead) {
      setLocalMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, readBy: [...(m.readBy || []), userEmail] } : m))
      );
      await markMessageAsRead(msg.id, userEmail);
    }
  };

  const handleDelete = async (e: React.MouseEvent, msgId: string) => {
    e.stopPropagation();
    // 1. Instant local removal for 0ms delay UI response
    setLocalMessages((prev) => prev.filter((m) => m.id !== msgId));
    // 2. Notify parent MainContent to update count and state
    onDeleteMessage?.(msgId);
    // 3. Persist deletion in local cache and Firestore
    await deleteAppMessage(msgId, userEmail);
  };

  const handleClearAll = async () => {
    if (localMessages.length === 0) return;
    const ids = localMessages.map((m) => m.id);
    setLocalMessages([]);
    onClearAllMessages?.();
    for (const id of ids) {
      await deleteAppMessage(id, userEmail);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#06111F] border border-[#BFA373]/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#BFA373]/30 bg-[#06111F] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#BFA373]/20 border border-[#BFA373]/40 flex items-center justify-center text-[#BFA373]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[#E0E0E0] font-cinzel tracking-wide">
                Messages & Updates
              </h2>
              {unreadMessages.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D1B079] text-[#06111F] uppercase tracking-wider">
                  {unreadMessages.length} New
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadMessages.length > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                title="Mark all as read"
                className="px-2.5 py-1.5 rounded-lg bg-[#06111F] hover:bg-[#BFA373]/20 text-[#E0E0E0] text-xs font-semibold flex items-center gap-1.5 border border-[#BFA373]/40 transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5 text-[#BFA373]" />
                <span className="hidden sm:inline text-[11px]">Mark Read</span>
              </button>
            )}

            {localMessages.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                title="Clear all messages"
                className="px-2.5 py-1.5 rounded-lg bg-[#06111F] hover:bg-rose-500/20 text-[#E0E0E0]/80 hover:text-rose-300 text-xs font-semibold flex items-center gap-1.5 border border-[#BFA373]/30 hover:border-rose-500/40 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">Clear All</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-[#E0E0E0]/60 hover:text-[#E0E0E0] rounded-lg hover:bg-[#BFA373]/15 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message List */}
        <div className="p-3.5 sm:p-4 overflow-y-auto space-y-3 flex-1">
          {localMessages.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#06111F] border border-[#BFA373]/30 flex items-center justify-center text-[#BFA373]">
                <Bell className="w-7 h-7 text-[#BFA373]" />
              </div>
              <h3 className="text-sm font-semibold text-[#E0E0E0]">No Messages</h3>
              <p className="text-xs text-[#E0E0E0]/70 max-w-xs mx-auto leading-relaxed">
                You have no notifications or messages at this time. New role appointments and announcements will appear here.
              </p>
            </div>
          ) : (
            localMessages.map((msg) => {
              const isRead = msg.readBy?.map((e) => e.toLowerCase()).includes(userEmail);
              const isRoleAppointed = msg.type === 'role_appointed' || msg.type === 'role_assigned';
              const isPoll = msg.type === 'new_poll' || msg.type === 'poll_created';

              return (
                <div
                  key={msg.id}
                  onClick={() => handleMessageClick(msg)}
                  className={`rounded-2xl p-3.5 sm:p-4 transition-all cursor-pointer border ${
                    !isRead
                      ? 'bg-[#06111F] border-[#BFA373] shadow-md shadow-black/30'
                      : 'bg-[#06111F] hover:bg-[#BFA373]/10 border-[#BFA373]/30'
                  }`}
                >
                  <div className="flex items-start gap-3 sm:gap-3.5">
                    {/* Category Icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isRoleAppointed
                          ? 'bg-[#BFA373]/20 border-[#BFA373]/40 text-[#BFA373]'
                          : isPoll
                          ? 'bg-[#D1B079]/20 border-[#D1B079]/40 text-[#D1B079]'
                          : 'bg-[#CBA96D]/20 border-[#CBA96D]/40 text-[#CBA96D]'
                      }`}
                    >
                      {isRoleAppointed ? (
                        <Award className="w-5 h-5" />
                      ) : isPoll ? (
                        <Vote className="w-5 h-5" />
                      ) : (
                        <Sparkles className="w-5 h-5" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-[#E0E0E0] font-cinzel tracking-wide leading-snug">
                            {msg.title}
                          </h4>
                          {msg.isBroadcast ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#BFA373]/20 text-[#BFA373] border border-[#BFA373]/30 flex items-center gap-1">
                              <Radio className="w-2.5 h-2.5" /> Public
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#D1B079]/20 text-[#D1B079] border border-[#D1B079]/30">
                              Personal Role
                            </span>
                          )}
                        </div>

                        {!isRead && (
                          <span className="w-2.5 h-2.5 rounded-full bg-[#BFA373] shrink-0 animate-pulse shadow-sm shadow-[#BFA373]" />
                        )}
                      </div>

                      {/* Main Message Body */}
                      <p className="text-xs sm:text-sm text-[#E0E0E0] mt-1.5 font-medium leading-relaxed">
                        {msg.message}
                      </p>

                      {/* Meta Footer */}
                      <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-[#BFA373]/20 text-[10px] sm:text-[11px] text-[#E0E0E0]/60">
                        <div className="flex items-center gap-1.5 truncate">
                          <Clock className="w-3 h-3 text-[#BFA373] shrink-0" />
                          <span>{formatTime(msg.createdAt)}</span>
                          {msg.createdBy?.name && (
                            <span className="truncate">• Sent by {msg.createdBy.name}</span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, msg.id)}
                          title="Delete notification"
                          className="p-1.5 hover:text-rose-400 text-[#E0E0E0]/70 transition-colors rounded-lg hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-[#BFA373] hover:text-rose-400 transition-colors" />
                          <span className="text-[10px] font-medium hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#06111F] border-t border-[#BFA373]/30 flex items-center justify-between text-xs text-[#E0E0E0]/70">
          <span className="text-[11px]">
            {unreadMessages.length > 0 
              ? `${unreadMessages.length} unread ${unreadMessages.length === 1 ? 'message' : 'messages'}`
              : 'All caught up!'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#BFA373] hover:bg-[#D1B079] text-[#06111F] font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
