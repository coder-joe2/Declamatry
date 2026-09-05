import React from 'react';
import { SidebarTab, UserProfile } from '../types';
import { SocietyLogo } from './SocietyLogo';
import {
  Home,
  Users,
  Lightbulb,
  Trophy,
  Layers,
  Vote,
  User,
  X,
  ChevronRight,
  LogOut,
  Sparkles,
  ShieldCheck,
  ClipboardList,
  Crown,
  Mic,
  Video,
} from 'lucide-react';

interface SidebarProps {
  activeTab: SidebarTab;
  onSelectTab: (tab: SidebarTab) => void;
  userProfile: UserProfile;
  onShowLoginDetails: () => void;
  onEditProfile?: () => void;
  onSignOut?: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  userProfile,
  onShowLoginDetails,
  onEditProfile,
  onSignOut,
  isOpenMobile,
  onCloseMobile,
}) => {
  const isAdmin = userProfile.isAdmin || userProfile.gmail?.toLowerCase() === 'vjana537@gmail.com';

  const userSidebarItems: { name: SidebarTab; label?: string; icon: React.FC<{ className?: string }> }[] = [
    { name: 'Home', icon: Home },
    { name: 'About Club', icon: Users },
    { name: 'Leadership Roles', label: 'Leadership Roles', icon: Crown },
    { name: 'Learning Tips', icon: Lightbulb },
    { name: 'Recommended Videos', label: 'Recommend Videos', icon: Video },
    { name: 'Leaderboard', icon: Trophy },
    { name: 'Levels', icon: Layers },
    { name: 'Profile', icon: User },
  ];

  const adminSidebarItems: { name: SidebarTab; label?: string; icon: React.FC<{ className?: string }> }[] = [
    { name: 'Home', icon: Home },
    { name: 'About Club', icon: Users },
    { name: 'Learning Tips', icon: Lightbulb },
    { name: 'Recommended Videos', label: 'Recommend Videos', icon: Video },
    { name: 'Leaderboard', icon: Trophy },
    { name: 'Levels', icon: Layers },
    { name: 'Profile', icon: User },
  ];

  const sidebarItems = isAdmin ? adminSidebarItems : userSidebarItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 left-0 z-50 h-full w-72 bg-[#050B14] text-slate-100 border-r border-[#1E2E48] flex flex-col transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#1E2E48] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SocietyLogo size="sm" className="border border-[#C5A880]/70 shadow-md shrink-0" />
            <div>
              <h2 className="font-cinzel font-bold text-white text-base tracking-wider leading-tight">
                DECLAMATE&apos;S
              </h2>
              <p className="text-[10px] tracking-[0.2em] text-[#C5A880] font-medium uppercase mt-0.5">
                SOCIETY
              </p>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Club Tagline Pill */}
        <div className="px-5 pt-4 pb-2">
          <div className="py-1 px-3 bg-[#0B1528] rounded-full border border-[#1E2E48] flex items-center justify-between text-[9px] font-bold tracking-[0.22em] text-[#C5A880] uppercase">
            <span>SPEAK</span>
            <span>•</span>
            <span>LEAD</span>
            <span>•</span>
            <span>INSPIRE</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3.5 py-3 space-y-1.5 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-2 font-cinzel">
            Navigation
          </p>
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;

            return (
              <button
                key={item.name}
                onClick={() => {
                  onSelectTab(item.name);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#C5A880] text-[#0A192F] font-bold shadow-lg shadow-[#C5A880]/15'
                    : 'text-slate-300 hover:text-white hover:bg-[#0E1E38]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#0A192F]' : 'text-[#C5A880]'}`} />
                <span className="flex-1 text-left tracking-wide font-cinzel">{item.label || item.name}</span>
                {isActive && <ChevronRight className="w-4 h-4 text-[#0A192F]" />}
              </button>
            );
          })}

          {/* Dedicated Admin Portal Section */}
          {isAdmin && (
            <div className="pt-3 mt-3 border-t border-[#1E2E48]/80 space-y-1.5">
              <div className="px-3 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C5A880] font-cinzel flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-[#C5A880]" />
                  Admin Only
                </p>
                <span className="px-1.5 py-0.2 text-[8px] bg-[#C5A880]/20 text-[#C5A880] border border-[#C5A880]/40 rounded font-bold uppercase font-mono">
                  Master
                </span>
              </div>
              <button
                onClick={() => {
                  onSelectTab('Leadership Roles');
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                  activeTab === 'Leadership Roles' || activeTab === 'Admin Executive Committee Roles'
                    ? 'bg-amber-500 text-[#0A192F] font-bold shadow-lg shadow-amber-500/20'
                    : 'text-amber-300 hover:text-white hover:bg-[#0E1E38] border border-amber-500/30'
                }`}
              >
                <Crown className={`w-4 h-4 ${activeTab === 'Leadership Roles' || activeTab === 'Admin Executive Committee Roles' ? 'text-[#0A192F]' : 'text-amber-400'}`} />
                <span className="flex-1 text-left tracking-wide font-cinzel font-semibold text-xs sm:text-sm">
                  Leadership Roles
                </span>
                {(activeTab === 'Leadership Roles' || activeTab === 'Admin Executive Committee Roles') && (
                  <ChevronRight className="w-4 h-4 text-[#0A192F]" />
                )}
              </button>
              <button
                onClick={() => {
                  onSelectTab('Admin Speaker Roles');
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                  activeTab === 'Admin Speaker Roles'
                    ? 'bg-amber-500 text-[#0A192F] font-bold shadow-lg shadow-amber-500/20'
                    : 'text-amber-300 hover:text-white hover:bg-[#0E1E38] border border-amber-500/30'
                }`}
              >
                <Mic className={`w-4 h-4 ${activeTab === 'Admin Speaker Roles' ? 'text-[#0A192F]' : 'text-amber-400'}`} />
                <span className="flex-1 text-left tracking-wide font-cinzel font-semibold text-xs sm:text-sm">
                  Speaker Roles
                </span>
                {activeTab === 'Admin Speaker Roles' && <ChevronRight className="w-4 h-4 text-[#0A192F]" />}
              </button>
              <button
                onClick={() => {
                  onSelectTab('Members List');
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                  activeTab === 'Members List'
                    ? 'bg-[#C5A880] text-[#0A192F] font-bold shadow-lg shadow-[#C5A880]/20'
                    : 'text-[#C5A880] hover:text-white hover:bg-[#0E1E38] border border-[#C5A880]/30'
                }`}
              >
                <Users className={`w-4 h-4 ${activeTab === 'Members List' ? 'text-[#0A192F]' : 'text-[#C5A880]'}`} />
                <span className="flex-1 text-left tracking-wide font-cinzel font-semibold">Members List</span>
                {activeTab === 'Members List' && <ChevronRight className="w-4 h-4 text-[#0A192F]" />}
              </button>
              <button
                onClick={() => {
                  onSelectTab('Voting');
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                  activeTab === 'Voting'
                    ? 'bg-amber-500 text-[#0A192F] font-bold shadow-lg shadow-amber-500/20'
                    : 'text-amber-300 hover:text-white hover:bg-[#0E1E38] border border-amber-500/30'
                }`}
              >
                <Vote className={`w-4 h-4 ${activeTab === 'Voting' ? 'text-[#0A192F]' : 'text-amber-400'}`} />
                <span className="flex-1 text-left tracking-wide font-cinzel font-semibold text-xs sm:text-sm">
                  Voting &amp; Polls
                </span>
                {activeTab === 'Voting' && <ChevronRight className="w-4 h-4 text-[#0A192F]" />}
              </button>
            </div>
          )}
        </nav>

        {/* User Card at bottom */}
        <div className="p-3.5 m-3.5 bg-[#0B1528] border border-[#1E2E48] rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            {userProfile.photoUrl ? (
              <img
                src={userProfile.photoUrl}
                alt={userProfile.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-[#C5A880]"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#0A192F] border-2 border-[#C5A880] flex items-center justify-center text-[#C5A880]">
                <User className="w-5 h-5" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate font-cinzel tracking-wider">
                {userProfile.name || 'Member'}
              </p>
              <p className="text-[11px] text-[#C5A880] truncate font-medium">
                {userProfile.year ? `${userProfile.year} • ` : ''}{userProfile.department || userProfile.gmail || 'Member'}{userProfile.className ? ` (${userProfile.className})` : ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                if (onEditProfile) onEditProfile();
                else onShowLoginDetails();
                onCloseMobile();
              }}
              className="bg-[#030712] hover:bg-[#112240] text-[#C5A880] hover:text-white py-2 px-2 rounded-xl text-[11px] font-medium transition-colors flex items-center justify-center gap-1 border border-[#1E2E48] cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>

            <button
              onClick={() => {
                if (onSignOut) onSignOut();
                else onShowLoginDetails();
                onCloseMobile();
              }}
              className="bg-[#030712] hover:bg-red-950/40 text-slate-400 hover:text-red-400 py-2 px-2 rounded-xl text-[11px] font-medium transition-colors flex items-center justify-center gap-1 border border-[#1E2E48] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
