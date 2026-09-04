import { useState, useEffect } from 'react';
import { SidebarTab, UserProfile } from './types';
import { LoginDetailsScreen } from './components/LoginDetailsScreen';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import { subscribeToRegisteredMembers } from './firebase';

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

  // Real-time synchronization: Keep active user's roles, details, and speaker honor updated from Firestore
  useEffect(() => {
    if (!userProfile.gmail && !userProfile.phone && !userProfile.id) {
      return;
    }

    const unsub = subscribeToRegisteredMembers((membersList) => {
      const currentEmail = userProfile.gmail?.trim().toLowerCase();
      const currentPhone = userProfile.phone?.trim();
      const currentId = userProfile.id;

      const matched = membersList.find((m) => {
        if (currentId && m.id === currentId) return true;
        if (currentEmail && m.gmail && m.gmail.trim().toLowerCase() === currentEmail) return true;
        if (currentPhone && m.phone && m.phone.trim() === currentPhone) return true;
        return false;
      });

      if (matched) {
        setUserProfile((prev) => {
          const updatedSpeakerRoles = Array.isArray(matched.speakerRoles) ? matched.speakerRoles : [];
          const updatedSpeakerRole = matched.speakerRole || updatedSpeakerRoles.join(', ') || '';

          const prevRolesArr = Array.isArray(prev.speakerRoles) ? prev.speakerRoles : [];
          const rolesChanged =
            prevRolesArr.length !== updatedSpeakerRoles.length ||
            prevRolesArr.some((r, i) => r !== updatedSpeakerRoles[i]) ||
            (prev.speakerRole || '') !== updatedSpeakerRole;

          const metaChanged =
            (prev.executiveRole || '') !== (matched.executiveRole || '') ||
            (prev.name || '') !== (matched.name || '') ||
            (prev.photoUrl || '') !== (matched.photoUrl || '') ||
            (prev.id || '') !== (matched.id || '');

          if (rolesChanged || metaChanged) {
            const nextProfile: UserProfile = {
              ...prev,
              id: matched.id,
              name: matched.name || prev.name,
              gmail: matched.gmail || prev.gmail,
              phone: matched.phone || prev.phone,
              year: matched.year || prev.year,
              department: matched.department || prev.department,
              className: matched.className || prev.className,
              photoUrl: matched.photoUrl || prev.photoUrl,
              executiveRole: matched.executiveRole || '',
              speakerRole: updatedSpeakerRole,
              speakerRoles: updatedSpeakerRoles,
              isAdmin: matched.isAdmin === true || (matched.gmail || '').toLowerCase() === 'vjana537@gmail.com',
            };

            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProfile));
            } catch (e) {
              console.warn('Failed to sync updated userProfile to localStorage:', e);
            }
            return nextProfile;
          }
          return prev;
        });
      }
    });

    return () => {
      unsub();
    };
  }, [userProfile.gmail, userProfile.phone, userProfile.id]);

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
        onUpdateProfile={handleUpdateProfile}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
      />
    </div>
  );
}
