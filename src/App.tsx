import { useState } from 'react';
import { SidebarTab, UserProfile } from './types';
import { LoginDetailsScreen } from './components/LoginDetailsScreen';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';

export default function App() {
  // App opens first with Login Details screen
  const [showLoginDetails, setShowLoginDetails] = useState<boolean>(true);
  const [loginScreenMode, setLoginScreenMode] = useState<'login' | 'register' | 'edit_profile'>('login');

  // Default User Profile login details (initially empty for user input)
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    gmail: '',
    phone: '',
    year: '',
    department: '',
    photoUrl: '',
  });

  const [activeTab, setActiveTab] = useState<SidebarTab>('Home');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

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
        onUpdateProfile={(updated) => setUserProfile(updated)}
        onContinue={() => setShowLoginDetails(false)}
        onCancelEdit={() => setShowLoginDetails(false)}
      />
    );
  }

  // Render Main Layout with Sidebar and Empty Pages
  return (
    <div className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-slate-950 text-slate-100 font-sans">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        userProfile={userProfile}
        onShowLoginDetails={handleOpenLogin}
        onEditProfile={handleOpenEditProfile}
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
