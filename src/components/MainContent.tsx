import React, { useState, useEffect } from 'react';
import { SidebarTab, UserProfile, AppMessage } from '../types';
import { Menu, Sparkles, User, LogOut, Home, Vote, Trophy, Layers, Lightbulb, Users, Crown, MessageSquare } from 'lucide-react';
import { HomeTab } from './tabs/HomeTab';
import { AboutClubTab } from './tabs/AboutClubTab';
import { LearningTipsTab } from './tabs/LearningTipsTab';
import { LeaderboardTab } from './tabs/LeaderboardTab';
import { LevelsTab } from './tabs/LevelsTab';
import { VotingTab } from './tabs/VotingTab';
import { ProfileTab } from './tabs/ProfileTab';
import { MembersListTab } from './tabs/MembersListTab';
import { ExecutiveRolesTab } from './tabs/ExecutiveRolesTab';
import { SpeakerRolesTab } from './tabs/SpeakerRolesTab';
import { RecommendedVideosTab } from './tabs/RecommendedVideosTab';
import { MessagesModal } from './MessagesModal';
import { subscribeToUserMessages } from '../firebase';

interface MainContentProps {
  activeTab: SidebarTab;
  onSelectTab: (tab: SidebarTab) => void;
  userProfile: UserProfile;
  onShowLoginDetails: () => void;
  onEditProfile?: () => void;
  onUpdateProfile?: (updated: UserProfile) => void;
  onOpenMobileSidebar: () => void;
}

export const MainContent: React.FC<MainContentProps> = ({
  activeTab,
  onSelectTab,
  userProfile,
  onShowLoginDetails,
  onEditProfile,
  onUpdateProfile,
  onOpenMobileSidebar,
}) => {
  const isAdmin = userProfile.isAdmin || userProfile.gmail?.toLowerCase() === 'vjana537@gmail.com';
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [messages, setMessages] = useState<AppMessage[]>([]);

  // Real-time subscription to incoming personal and broadcast messages
  useEffect(() => {
    const email = userProfile.gmail || '';
    const unsubscribe = subscribeToUserMessages(email, (updated) => {
      setMessages(updated);
    });
    return () => unsubscribe();
  }, [userProfile.gmail]);

  const userEmail = (userProfile.gmail || '').trim().toLowerCase();
  const unreadCount = messages.filter(
    (m) => !m.readBy?.map((e) => e.toLowerCase()).includes(userEmail)
  ).length;

  const mobileNavItems: { name: SidebarTab; icon: React.FC<{ className?: string }>; label: string }[] = [
    { name: 'Home', icon: Home, label: 'Home' },
    ...(isAdmin
      ? [{ name: 'Voting' as SidebarTab, icon: Vote, label: 'Voting' }]
      : [{ name: 'Leadership Roles' as SidebarTab, icon: Crown, label: 'Roles' }]),
    { name: 'Leaderboard', icon: Trophy, label: 'Leaders' },
    { name: 'Levels', icon: Layers, label: 'Levels' },
    { name: 'Profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen min-w-0 w-full max-w-full overflow-x-hidden bg-[#030712] text-slate-100 font-sans selection:bg-[#C5A880] selection:text-[#0A192F]">
      {/* Top Navbar - Mobile optimized */}
      <header className="h-14 sm:h-20 px-3 sm:px-8 lg:px-10 bg-[#050B14]/95 border-b border-[#1E2E48] flex items-center justify-between sticky top-0 z-30 backdrop-blur-md shadow-lg shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 text-slate-300 hover:text-white bg-[#0E1E38] hover:bg-[#152B4D] active:scale-95 rounded-xl transition-colors cursor-pointer border border-[#1E2E48] min-w-[38px] min-h-[38px] flex items-center justify-center shrink-0"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-cinzel text-sm sm:text-2xl font-bold text-white tracking-wider uppercase leading-tight truncate">
              {activeTab === 'Admin Executive Committee Roles' || activeTab === 'Leadership Roles'
                ? 'Leadership Roles'
                : activeTab === 'Admin Speaker Roles'
                ? 'Speaker Roles'
                : activeTab}
            </h1>
            <p className="text-[9px] sm:text-[11px] text-[#C5A880] uppercase tracking-widest font-semibold font-cinzel truncate max-w-[180px] sm:max-w-none">
              Sri Amaraavathi College, Karur
            </p>
          </div>
        </div>

        {/* Right Action Header Info */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Message / Notification Icon Button - Directly to the left of profile */}
          <button
            type="button"
            onClick={() => setIsMessagesOpen(true)}
            title="Messages & Notifications"
            aria-label="View Messages"
            className="relative p-2 sm:p-2.5 rounded-full bg-[#0B1528] hover:bg-[#112240] border border-[#1E2E48] hover:border-[#00A884]/60 text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center min-w-[36px] min-h-[36px]"
          >
            <MessageSquare className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#00A884]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-amber-500 text-[#0A192F] font-black text-[10px] rounded-full flex items-center justify-center shadow-lg shadow-amber-500/40 border border-[#050B14]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Profile Card / Avatar Button */}
          <div 
            onClick={() => onSelectTab('Profile')}
            className="flex items-center gap-2 px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-[#0B1528] hover:bg-[#112240] border border-[#1E2E48] hover:border-[#C5A880]/50 cursor-pointer transition-all shadow-sm active:scale-95"
          >
            {userProfile.photoUrl ? (
              <img
                src={userProfile.photoUrl}
                alt={userProfile.name}
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover border border-[#C5A880]"
              />
            ) : (
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#0A192F] text-[#C5A880] flex items-center justify-center text-[10px] sm:text-xs border border-[#C5A880]/40 font-bold">
                {userProfile.name ? userProfile.name[0].toUpperCase() : <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
              </div>
            )}
            <span className="text-xs font-semibold text-slate-200 hidden sm:inline max-w-[120px] truncate">
              {userProfile.name || 'Member'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Tab Content - Mobile responsive margins & padding */}
      <main className="flex-1 px-2.5 py-3 sm:px-6 sm:py-6 lg:p-10 max-w-7xl w-full min-w-0 mx-auto pb-24 lg:pb-10 overflow-x-hidden">
        {activeTab === 'Home' && (
          <HomeTab 
            userProfile={userProfile} 
            onNavigateTab={(tab) => onSelectTab(tab)} 
          />
        )}

        {activeTab === 'About Club' && <AboutClubTab />}

        {activeTab === 'Learning Tips' && <LearningTipsTab />}

        {activeTab === 'Recommended Videos' && <RecommendedVideosTab userProfile={userProfile} />}

        {activeTab === 'Leaderboard' && <LeaderboardTab userProfile={userProfile} />}

        {activeTab === 'Levels' && <LevelsTab userProfile={userProfile} />}

        {activeTab === 'Voting' && <VotingTab userProfile={userProfile} />}

        {activeTab === 'Profile' && (
          <ProfileTab 
            userProfile={userProfile} 
            onEditProfile={onEditProfile || onShowLoginDetails} 
          />
        )}

        {activeTab === 'Members List' && (
          <MembersListTab 
            userProfile={userProfile} 
            onEditProfile={onEditProfile || onShowLoginDetails} 
          />
        )}

        {(activeTab === 'Admin Executive Committee Roles' || activeTab === 'Leadership Roles') && (
          <ExecutiveRolesTab 
            userProfile={userProfile} 
          />
        )}

        {activeTab === 'Admin Speaker Roles' && (
          <SpeakerRolesTab 
            userProfile={userProfile} 
            onUpdateProfile={onUpdateProfile}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (WhatsApp / Native Mobile App Style) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#050B14]/95 border-t border-[#1E2E48] backdrop-blur-xl px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-bottom">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.name;

          return (
            <button
              key={item.name}
              onClick={() => onSelectTab(item.name)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer relative min-w-[56px] ${
                isActive
                  ? 'text-[#C5A880]'
                  : 'text-slate-400 hover:text-slate-200 active:scale-95'
              }`}
            >
              {isActive && (
                <div className="absolute -top-1.5 w-8 h-1 bg-[#C5A880] rounded-full shadow-[0_0_8px_#C5A880]" />
              )}
              <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-[#C5A880]/15' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </div>
              <span className={`text-[10px] font-cinzel tracking-wider mt-0.5 ${isActive ? 'font-bold text-[#C5A880]' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Messages & Notifications Modal */}
      <MessagesModal
        isOpen={isMessagesOpen}
        onClose={() => setIsMessagesOpen(false)}
        messages={messages}
        userProfile={userProfile}
      />
    </div>
  );
};

