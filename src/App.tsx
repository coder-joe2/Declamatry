import { useState } from 'react';
import { SidebarTab, UserProfile } from './types';
import { LoginDetailsScreen } from './components/LoginDetailsScreen';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';

const STORAGE_KEY = 'declamates_active_user';

export default function App() {
  // Load saved user profile from localStorage if exists
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.name || parsed.gmail)) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Failed to parse saved user session:', err);
    }
    return {
      name: '',
      gmail: '',
      phone: '',
      year: '',
      department: '',
      photoUrl: '',
    };
  });

  // App opens first with Login Details screen ONLY if no user is already logged in
  const [showLoginDetails, setShowLoginDetails] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.name || parsed.gmail)) {
          return false; // Direct to Home page since user is already logged in!
        }
      }
    } catch (err) {
      console.warn('Failed to check stored user session:', err);
    }
    return true;
  });

  const [loginScreenMode, setLoginScreenMode] = useState<'login' | 'register' | 'edit_profile'>('login');
  const [activeTab, setActiveTab] = useState<SidebarTab>('Home');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const handleUpdateProfile = (updated: UserProfile) => {
    setUserProfile(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save user session to localStorage:', e);
    }
  };

  const handleSignOut = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear user session from localStorage:', e);
    }
    setUserProfile({
      name: '',
      gmail: '',
      phone: '',
      year: '',
      department: '',
      photoUrl: '',
    });
    setLoginScreenMode('login');
    setShowLoginDetails(true);
  };

  const handleOpenEditProfile = () => {
    setLoginScreenMode('edit_profile');
    setShowLoginDetails(true);
  };

  const handleOpenLogin = () => {
    setLoginScreenMode('login');
    setShowLoginDetails(true);
  };

  // Render Login / Edit Profile Details Screen
  if (showLoginDetails) {
    return (
      <LoginDetailsScreen
        profile={userProfile}
        initialMode={loginScreenMode}
        onUpdateProfile={handleUpdateProfile}
        onContinue={() => setShowLoginDetails(false)}
        onCancelEdit={() => setShowLoginDetails(false)}
      />
    );
  }

  // Render Main Layout with Sidebar and Content Pages
  return (
    <div className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-slate-950 text-slate-100 font-sans">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        userProfile={userProfile}
        onShowLoginDetails={handleOpenLogin}
        onEditProfile={handleOpenEditProfile}
        onSignOut={handleSignOut}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <MainContent
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        userProfile={userProfile}
        onShowLoginDetails={handleOpenLogin}
        onEditProfile={handleOpenEditProfile}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
      />
    </div>
  );
}
