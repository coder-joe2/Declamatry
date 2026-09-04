import React from 'react';
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
}

export const MessagesModal: React.FC<MessagesModalProps> = ({
  isOpen,
  onClose,
  messages,
  userProfile,
}) => {
  if (!isOpen) return null;

  const userEmail = (userProfile.gmail || '').trim().toLowerCase();
  
  const unreadMessages = messages.filter(
    (m) => !m.readBy?.map((e) => e.toLowerCase()).includes(userEmail)
  );

  const handleMarkAllRead = async () => {
    if (unreadMessages.length === 0) return;
    const ids = unreadMessages.map((m) => m.id);
    await markAllMessagesAsRead(userEmail, ids);
  };

  const handleMessageClick = async (msg: AppMessage) => {
    const isRead = msg.readBy?.map((e) => e.toLowerCase()).includes(userEmail);
    if (!isRead) {
      await markMessageAsRead(msg.id, userEmail);
    }
  };

  const handleDelete = async (e: React.MouseEvent, msgId: string) => {
    e.stopPropagation();
    await deleteAppMessage(msgId);
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
        className="relative w-full max-w-lg bg-[#0B141A] border border-[#1F2C34] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1F2C34] bg-[#111B21] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#00A884]/20 border border-[#00A884]/40 flex items-center justify-center text-[#00A884]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white font-cinzel tracking-wide">
                Messages & Updates
              </h2>
              {unreadMessages.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-[#0B141A] uppercase tracking-wider">
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
                className="px-2.5 py-1.5 rounded-lg bg-[#182630] hover:bg-[#20313E] text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-[#2A3942] transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5 text-[#00A884]" />
                <span className="hidden sm:inline text-[11px]">Mark Read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#182630] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message List */}
        <div className="p-3.5 sm:p-4 overflow-y-auto space-y-3 flex-1">
          {messages.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#111B21] border border-[#1F2C34] flex items-center justify-center text-slate-500">
                <Bell className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">No Messages Yet</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                You will receive instant messages here whenever you are appointed to a speaker role or when new polls are started!
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isRead = msg.readBy?.map((e) => e.toLowerCase()).includes(userEmail);
              const isRoleAppointed = msg.type === 'role_appointed';
              const isPoll = msg.type === 'new_poll';

              return (
                <div
                  key={msg.id}
                  onClick={() => handleMessageClick(msg)}
                  className={`rounded-2xl p-3.5 sm:p-4 transition-all cursor-pointer border ${
                    !isRead
                      ? 'bg-[#111B21] border-[#00A884]/50 shadow-md shadow-black/30'
                      : 'bg-[#0B141A] hover:bg-[#111B21]/60 border-[#1F2C34]'
                  }`}
                >
                  <div className="flex items-start gap-3 sm:gap-3.5">
                    {/* Category Icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isRoleAppointed
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                          : isPoll
                          ? 'bg-[#00A884]/20 border-[#00A884]/40 text-[#00A884]'
                          : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
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
                          <h4 className="text-xs sm:text-sm font-bold text-white font-cinzel tracking-wide leading-snug">
                            {msg.title}
                          </h4>
                          {msg.isBroadcast ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#00A884]/20 text-[#00A884] border border-[#00A884]/30 flex items-center gap-1">
                              <Radio className="w-2.5 h-2.5" /> Public Poll
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Personal Role
                            </span>
                          )}
                        </div>

                        {!isRead && (
                          <span className="w-2.5 h-2.5 rounded-full bg-[#00A884] shrink-0 animate-pulse shadow-sm shadow-[#00A884]" />
                        )}
                      </div>

                      {/* Main Message Body */}
                      <p className="text-xs sm:text-sm text-slate-100 mt-1.5 font-medium leading-relaxed">
                        {msg.message}
                      </p>

                      {/* Meta Footer */}
                      <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-[#1F2C34]/60 text-[10px] sm:text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5 truncate">
                          <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{formatTime(msg.createdAt)}</span>
                          {msg.createdBy?.name && (
                            <span className="truncate">• Sent by {msg.createdBy.name}</span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, msg.id)}
                          title="Delete message"
                          className="p-1 hover:text-rose-400 text-slate-500 transition-colors rounded hover:bg-[#182630]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
        <div className="p-3 bg-[#111B21] border-t border-[#1F2C34] flex items-center justify-between text-xs text-slate-400">
          <span className="text-[11px]">
            {unreadMessages.length > 0 
              ? `${unreadMessages.length} unread ${unreadMessages.length === 1 ? 'message' : 'messages'}`
              : 'All caught up!'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#182630] hover:bg-[#20313E] text-white font-semibold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
