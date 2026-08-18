import { useState } from 'react';
import { SidebarTab, UserProfile } from './types';
import { LoginDetailsScreen } from './components/LoginDetailsScreen';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';

export default function App() {
  // App opens first with Login Details screen
  const [showLoginDetails, setShowLoginDetails] = useState<boolean>(true);

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

  // Render Login Details Screen first
  if (showLoginDetails) {
    return (
      <LoginDetailsScreen
        profile={userProfile}
        onUpdateProfile={(updated) => setUserProfile(updated)}
        onContinue={() => setShowLoginDetails(false)}
      />
    );
  }

  // Render Main Layout with Sidebar and Empty Pages
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        userProfile={userProfile}
        onShowLoginDetails={() => setShowLoginDetails(true)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <MainContent
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        userProfile={userProfile}
        onShowLoginDetails={() => setShowLoginDetails(true)}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
      />
    </div>
  );
}
