import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, isUserAdmin } from '../types';
import { 
  saveUserLoginToFirebase, 
  authenticateMember, 
  triggerPasswordReset 
} from '../firebase';
import { SocietyLogo } from './SocietyLogo';
import { ImageCropModal } from './ImageCropModal';
import {
  Mail,
  Phone,
  User,
  Plus,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
  GraduationCap,
  BookOpen,
  Eye,
  EyeOff,
  Lock,
  ArrowLeft,
  KeyRound
} from 'lucide-react';

const YEAR_OPTIONS = ['I Year', 'II Year', 'III Year'] as const;

export const STANDARD_DEPARTMENTS = [
  'B.com',
  'B.sc',
  'B.A English Litrature',
  'BBA',
  'BCA',
] as const;

export const DEPARTMENT_OPTIONS = [
  'B.com',
  'B.sc',
  'B.A English Litrature',
  'BBA',
  'BCA',
  'Others',
] as const;

export const CLASS_OPTIONS_BY_DEPARTMENT: Record<string, string[]> = {
  'B.sc': [
    'Mathematics',
    'Computer Science',
    'Artificial Intelligence & Machine Learning',
    'Cyber Security',
    'Fashion Technology & Costume',
    'Others',
  ],
  'B.com': [
    'Computer Applications',
    'Professional Account/CMA Integrated',
    'Others',
  ],
  'B.A English Litrature': [
    'Tamil Literature',
    'English Literature',
    'Others',
  ],
  'BBA': [
    'General Management',
    'Finance',
    'Marketing',
    'Others',
  ],
  'BCA': [
    'Computer Applications',
    'Data Analytics',
    'Others',
  ],
  'Others': [
    'Others',
  ],
};

const getDeptInitial = (dept?: string) => {
  if (!dept) return { select: '', custom: '' };
  if (STANDARD_DEPARTMENTS.includes(dept as any)) {
    return { select: dept, custom: '' };
  }
  return { select: 'Others', custom: dept };
};

const getClassInitial = (deptSelect: string, classVal?: string) => {
  if (!classVal) return { select: '', custom: '' };
  const available = CLASS_OPTIONS_BY_DEPARTMENT[deptSelect] || [];
  if (available.includes(classVal) && classVal !== 'Others') {
    return { select: classVal, custom: '' };
  }
  return { select: 'Others', custom: classVal };
};

interface LoginDetailsScreenProps {
  profile: UserProfile;
  initialMode?: 'login' | 'register' | 'edit_profile';
  onUpdateProfile: (updated: UserProfile) => void;
  onContinue: () => void;
  onCancelEdit?: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot_password' | 'edit_profile';

export const LoginDetailsScreen: React.FC<LoginDetailsScreenProps> = ({
  profile,
  initialMode = 'login',
  onUpdateProfile,
  onContinue,
  onCancelEdit,
}) => {
  // Mode state: Defaults to initialMode
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);

  // Sign-In credentials state
  const [loginIdentifier, setLoginIdentifier] = useState<string>(profile.gmail || '');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);

  // Registration & Edit state
  const [regData, setRegData] = useState<UserProfile>({
    name: profile.name || '',
    gmail: profile.gmail || '',
    phone: profile.phone || '',
    year: profile.year || 'I Year',
    department: profile.department || '',
    className: profile.className || '',
    photoUrl: profile.photoUrl || '',
    password: profile.password || '',
  });
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');

  // Department and Class state helpers
  const initialDept = getDeptInitial(profile.department);
  const [deptSelect, setDeptSelect] = useState<string>(initialDept.select);
  const [customDept, setCustomDept] = useState<string>(initialDept.custom);

  const initialClass = getClassInitial(initialDept.select, profile.className);
  const [classSelect, setClassSelect] = useState<string>(initialClass.select);
  const [customClass, setCustomClass] = useState<string>(initialClass.custom);

  // Keep state synced if initialMode or profile changes
  useEffect(() => {
    if (initialMode) {
      setAuthMode(initialMode);
    }
  }, [initialMode]);

  useEffect(() => {
    setRegData({
      name: profile.name || '',
      gmail: profile.gmail || '',
      phone: profile.phone || '',
      year: profile.year || 'I Year',
      department: profile.department || '',
      className: profile.className || '',
      photoUrl: profile.photoUrl || '',
      password: profile.password || '',
    });
    const dInit = getDeptInitial(profile.department);
    setDeptSelect(dInit.select);
    setCustomDept(dInit.custom);

    const cInit = getClassInitial(dInit.select, profile.className);
    setClassSelect(cInit.select);
    setCustomClass(cInit.custom);

    setLoginIdentifier(profile.gmail || '');
  }, [profile]);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string>('');

  // Status & error indicators
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [photoError, setPhotoError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [croppingImageSrc, setCroppingImageSrc] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Photo upload for Registration & Edit (opens circular crop tool)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCroppingImageSrc(event.target?.result as string);
        }
      };
      reader.readAsDataURL(file);
      // Reset input value so same file can be re-selected if needed
      e.target.value = '';
    }
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    setRegData((prev) => ({
      ...prev,
      photoUrl: croppedDataUrl,
    }));
    setCroppingImageSrc(null);
    setPhotoError(false);
    setErrorMessage('');
  };

  const handleCancelCrop = () => {
    setCroppingImageSrc(null);
  };

  // 1. Handle Simple Sign-In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const identifier = loginIdentifier.trim();
    if (!identifier) {
      setErrorMessage('Please enter your username or email address.');
      return;
    }

    if (!loginPassword.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authenticateMember(identifier, loginPassword);
      if (result.success && result.profile) {
        onUpdateProfile(result.profile);
        onContinue();
      } else {
        setErrorMessage(
          result.error ||
            'Account not found. Please click "Register / Create an account" below to register.'
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle Direct Registration & Profile Update Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setPhotoError(false);

    const isEditMode = authMode === 'edit_profile';

    if (!regData.photoUrl) {
      setPhotoError(true);
      setErrorMessage('Profile picture is mandatory. Please upload a clear photo for your official member badge.');
      return;
    }

    if (!regData.name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!regData.gmail.trim() || !regData.gmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    // Password validation
    if (!isEditMode && !regData.password?.trim()) {
      setErrorMessage('Please create a password for your account.');
      return;
    }

    // Password validation for edit mode if typed
    if (isEditMode && regData.password) {
      if (regConfirmPassword && regData.password !== regConfirmPassword) {
        setErrorMessage('New passwords do not match. Please verify.');
        return;
      }
    }

    if (!regData.phone.trim()) {
      setErrorMessage('Please enter your contact phone number.');
      return;
    }

    if (!regData.year?.trim()) {
      setErrorMessage('Please select your Year of Study (I Year, II Year, or III Year).');
      return;
    }

    // Validate Department
    if (!deptSelect) {
      setErrorMessage('Please select your Department / Degree.');
      return;
    }

    let finalDepartment = deptSelect.trim();
    if (deptSelect === 'Others') {
      if (!customDept.trim()) {
        setErrorMessage('Please enter your Department / Degree in CAPITAL LETTERS.');
        return;
      }
      finalDepartment = customDept.trim().toUpperCase();
    }

    // Validate Class
    const availableClasses = CLASS_OPTIONS_BY_DEPARTMENT[deptSelect] || (deptSelect === 'Others' ? ['Others'] : []);
    let finalClassName = '';

    if (availableClasses.length > 0) {
      if (!classSelect) {
        setErrorMessage('Please select your Class / Specialization.');
        return;
      }
      if (classSelect === 'Others') {
        if (!customClass.trim()) {
          setErrorMessage('Please enter your Class / Specialization in CAPITAL LETTERS.');
          return;
        }
        finalClassName = customClass.trim().toUpperCase();
      } else {
        finalClassName = classSelect.trim();
      }
    } else if (classSelect === 'Others' || customClass.trim()) {
      finalClassName = customClass.trim().toUpperCase();
    }

    setIsLoading(true);

    const finalProfile: UserProfile = {
      ...profile,
      ...regData,
      name: regData.name.trim(),
      gmail: regData.gmail.trim().toLowerCase(),
      phone: regData.phone.trim(),
      year: regData.year,
      department: finalDepartment,
      className: finalClassName,
      photoUrl: regData.photoUrl,
      password: regData.password?.trim() || profile.password || '',
      isAdmin: isUserAdmin({ name: regData.name.trim(), gmail: regData.gmail.trim().toLowerCase() }),
    };

    try {
      const res = await saveUserLoginToFirebase(finalProfile);
      if (!res.success) {
        console.warn('Firebase notice:', res.error);
      }
      setSuccessMessage(
        isEditMode
          ? 'Profile updated successfully!'
          : 'Registration successful! Welcome to The Declamate’s Society.'
      );
      setTimeout(() => {
        onUpdateProfile(finalProfile);
        onContinue();
      }, 400);
    } catch (err) {
      console.error('Save error:', err);
      onUpdateProfile(finalProfile);
      onContinue();
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Handle Password Reset Request
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setResetSuccessMessage('');

    const targetEmail = forgotEmail.trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address to receive password reset link.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await triggerPasswordReset(targetEmail);
      if (res.success) {
        setResetSuccessMessage(
          res.message || 'Password reset instructions have been sent to your email. Please check your inbox or spam folder.'
        );
      } else {
        setErrorMessage(res.message || 'Failed to send reset link. Please verify your email.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error requesting password reset';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06111F] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-x-hidden font-sans">
      {/* Background Decorative Glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[340px] sm:w-[550px] h-[340px] sm:h-[550px] bg-[#BFA373]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-[#06111F]/60 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10 my-auto">
        {/* Society Branding Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-1 rounded-full shadow-2xl">
              <SocietyLogo size="lg" />
            </div>
          </div>
          <h1 className="font-cinzel text-xl sm:text-2xl font-bold tracking-[0.25em] text-[#C5A059] uppercase drop-shadow-md leading-relaxed">
            THE DECLAMATE&apos;S
            <br />
            SOCIETY
          </h1>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-4 bg-red-950/80 border border-red-500/60 rounded-xl p-3.5 flex items-start gap-2.5 text-red-200 text-xs sm:text-sm backdrop-blur-sm animate-in fade-in shadow-lg">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Global Success Banner */}
        {successMessage && (
          <div className="mb-4 bg-emerald-950/80 border border-emerald-500/60 rounded-xl p-3.5 flex items-start gap-2.5 text-emerald-200 text-xs sm:text-sm backdrop-blur-sm animate-in fade-in shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">{successMessage}</div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: SIMPLE SIGN-IN                                                    */}
        {/* ========================================================================= */}
        {authMode === 'login' && (
          <div className="bg-[#071120] border border-slate-800/80 rounded-2xl p-7 sm:p-9 shadow-2xl backdrop-blur-md">
            <div className="mb-6 text-center">
              <h2 className="font-cinzel text-xl font-bold text-white uppercase tracking-wider">
                MEMBER SIGN IN
              </h2>
              <p className="text-sm text-slate-400 mt-2">
                Sign in to access your portal, events &amp; voting
              </p>
            </div>

            <form onSubmit={handleSignIn} className="space-y-5">
              {/* 1. Username or Email Address input */}
              <div>
                <label className="text-sm font-semibold text-white block mb-2">
                  Username or email address
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => {
                      setLoginIdentifier(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Enter your username or email"
                    className="w-full bg-[#030814] border border-blue-500/80 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/60 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 text-sm outline-none shadow-sm transition-all"
                  />
                </div>
              </div>

              {/* 2. Password field with Forgot password? on the right */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-white">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage('');
                      setForgotEmail(loginIdentifier);
                      setAuthMode('forgot_password');
                    }}
                    className="text-sm text-blue-400 hover:text-blue-300 font-normal cursor-pointer transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Enter your password"
                    className="w-full bg-[#030814] border border-slate-800 focus:border-blue-500/80 focus:ring-1 focus:ring-blue-400/60 rounded-xl px-4 py-3 pr-11 text-white placeholder:text-slate-500 text-sm outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer p-1"
                    title={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* 3. Primary Green "Sign in" Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#16a34a] hover:bg-[#15803d] active:bg-[#166534] disabled:bg-[#16a34a]/50 text-white py-3.5 px-4 rounded-xl font-bold text-base tracking-wide transition-all shadow-lg shadow-emerald-950/40 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Sign in</span>
                  )}
                </button>
              </div>

              {/* 4. Switch to Direct Registration Link */}
              <div className="pt-4 text-center border-t border-slate-800/80 mt-6">
                <p className="text-sm text-slate-300">
                  New member?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage('');
                      setSuccessMessage('');
                      setRegData((prev) => ({
                        ...prev,
                        gmail: loginIdentifier || prev.gmail,
                      }));
                      setAuthMode('register');
                    }}
                    className="text-[#D1B079] hover:text-amber-300 font-medium underline underline-offset-4 cursor-pointer transition-colors ml-1"
                  >
                    Register / Create an account
                  </button>
                </p>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: UNIFIED MEMBER REGISTRATION & PROFILE EDIT                        */}
        {/* ========================================================================= */}
        {(authMode === 'register' || authMode === 'edit_profile') && (
          <div className="bg-[#06111F] border border-[#BFA373]/40 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-3">
              <div>
                <h2 className="font-cinzel text-lg sm:text-xl font-bold text-white uppercase tracking-wide">
                  {authMode === 'edit_profile' ? 'Edit Member Profile' : 'Member Registration'}
                </h2>
                <p className="text-xs text-[#BFA373]">
                  {authMode === 'edit_profile'
                    ? 'Update your profile information'
                    : 'Complete your official member profile & badge'}
                </p>
              </div>
              {authMode === 'edit_profile' ? (
                <button
                  type="button"
                  onClick={onCancelEdit || onContinue}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to App</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    setAuthMode('login');
                  }}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              )}
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {/* Profile Picture Upload (Mandatory) */}
              <div className="text-center">
                <p className="text-xs text-slate-300 font-medium mb-1.5">
                  Profile Picture <span className="text-red-400 font-bold">* Mandatory for badge</span>
                </p>
                <div className="flex justify-center">
                  <div className="relative">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      accept="image/*"
                      className="hidden"
                    />

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload profile picture"
                      className={`w-20 h-20 rounded-full border-2 ${
                        photoError
                          ? 'border-red-500 ring-4 ring-red-500/30 bg-red-950/30'
                          : regData.photoUrl
                          ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                          : 'border-[#BFA373] bg-[#06111F]'
                      } flex items-center justify-center cursor-pointer shadow-lg hover:scale-105 transition-all overflow-hidden relative group`}
                    >
                      {regData.photoUrl ? (
                        <img
                          src={regData.photoUrl}
                          alt="Profile preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Camera className={`w-7 h-7 ${photoError ? 'text-red-400' : 'text-[#BFA373]'}`} />
                      )}

                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-5 h-5 text-white" />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`absolute bottom-0 right-0 w-6 h-6 rounded-full ${
                        photoError ? 'bg-red-500' : 'bg-[#BFA373] hover:bg-[#BFA373]'
                      } text-[#06111F] flex items-center justify-center border-2 border-[#06111F] shadow-md transition-colors`}
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-slate-200 block mb-1">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BFA373]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={regData.name}
                    onChange={(e) => {
                      setRegData({ ...regData, name: e.target.value });
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="e.g. Alex Morgan"
                    className="w-full bg-[#06111F] border border-slate-700/80 focus:border-[#BFA373] focus:ring-1 focus:ring-[#BFA373]/30 rounded-xl px-3.5 py-2.5 pl-10 text-white placeholder:text-slate-500 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-slate-200 block mb-1">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BFA373]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={regData.gmail}
                    onChange={(e) => {
                      setRegData({ ...regData, gmail: e.target.value });
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="e.g. alex@gmail.com"
                    className="w-full bg-[#06111F] border border-slate-700/80 focus:border-[#BFA373] focus:ring-1 focus:ring-[#BFA373]/30 rounded-xl px-3.5 py-2.5 pl-10 text-white placeholder:text-slate-500 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password (Immediately below Email Address) */}
              {authMode === 'register' ? (
                <div>
                  <label className="text-xs sm:text-sm font-medium text-slate-200 block mb-1">
                    Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BFA373]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regData.password || ''}
                      onChange={(e) => {
                        setRegData({ ...regData, password: e.target.value });
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="Create a password for your account"
                      className="w-full bg-[#06111F] border border-slate-700/80 focus:border-[#BFA373] focus:ring-1 focus:ring-[#BFA373]/30 rounded-xl px-3.5 py-2.5 pl-10 pr-11 text-white placeholder:text-slate-500 text-sm outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
                      title={showRegPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* In Edit mode: optional password update fields */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-medium text-slate-200 block mb-1">
                      New Password (optional)
                    </label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        value={regData.password || ''}
                        onChange={(e) => {
                          setRegData({ ...regData, password: e.target.value });
                          if (errorMessage) setErrorMessage('');
                        }}
                        placeholder="Keep existing"
                        className="w-full bg-[#06111F] border border-slate-700/80 focus:border-[#BFA373] focus:ring-1 focus:ring-[#BFA373]/30 rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 text-xs sm:text-sm outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-200 block mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required={Boolean(regData.password)}
                        value={regConfirmPassword}
                        onChange={(e) => {
                          setRegConfirmPassword(e.target.value);
                          if (errorMessage) setErrorMessage('');
                        }}
                        placeholder="Confirm new"
                        className="w-full bg-[#06111F] border border-slate-700/80 focus:border-[#BFA373] focus:ring-1 focus:ring-[#BFA373]/30 rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 text-xs sm:text-sm outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Phone Number */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-slate-200 block mb-1">
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BFA373]">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={regData.phone}
                    onChange={(e) => {
                      setRegData({ ...regData, phone: e.target.value });
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="+91 98765 43210"
                    className="w-full bg-[#06111F] border border-slate-700/80 focus:border-[#BFA373] focus:ring-1 focus:ring-[#BFA373]/30 rounded-xl px-3.5 py-2.5 pl-10 text-white placeholder:text-slate-500 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              {/* Year of Study */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-slate-200 block mb-1">
                  Year of Study <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {YEAR_OPTIONS.map((yr) => {
                    const isSelected = regData.year === yr;
                    return (
                      <button
                        type="button"
                        key={yr}
                        onClick={() => {
                          setRegData({ ...regData, year: yr });
                          if (errorMessage) setErrorMessage('');
                        }}
                        className={`py-2 px-2 rounded-xl text-xs font-semibold tracking-wide border transition-all cursor-pointer text-center ${
                          isSelected
                            ? 'bg-[#BFA373] text-[#06111F] border-[#BFA373] shadow-md font-bold'
                            : 'bg-[#06111F] text-slate-300 border-slate-800 hover:border-[#BFA373]/50'
                        }`}
                      >
                        {yr}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Department */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-slate-200 block">
                  Department / Degree <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BFA373]">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <select
                    required
                    value={deptSelect}
                    onChange={(e) => {
                      const newDept = e.target.value;
                      setDeptSelect(newDept);
                      if (newDept === 'Others') {
                        setRegData((prev) => ({
                          ...prev,
                          department: customDept.trim().toUpperCase(),
                        }));
                        setClassSelect('Others');
                      } else {
                        setRegData((prev) => ({
                          ...prev,
                          department: newDept,
                        }));
                        const available = CLASS_OPTIONS_BY_DEPARTMENT[newDept] || [];
                        if (!available.includes(classSelect)) {
                          setClassSelect('');
                          setCustomClass('');
                          setRegData((prev) => ({ ...prev, className: '' }));
                        }
                      }
                      if (errorMessage) setErrorMessage('');
                    }}
                    className="w-full bg-[#06111F] border border-slate-700/80 focus:border-[#BFA373] focus:ring-1 focus:ring-[#BFA373]/30 rounded-xl px-3.5 py-2.5 pl-10 text-white text-sm outline-none transition-all cursor-pointer"
                  >
                    <option value="" className="bg-[#06111F] text-slate-400">
                      -- Select Department --
                    </option>
                    {DEPARTMENT_OPTIONS.map((dept) => (
                      <option key={dept} value={dept} className="bg-[#06111F] text-white">
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Department Input when 'Others' is selected */}
                {deptSelect === 'Others' && (
                  <div className="p-3.5 rounded-xl bg-[#06111F] border border-[#BFA373]/40 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 text-xs text-[#BFA373] font-medium">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>Note: Please enter your Department / Degree in CAPITAL LETTERS.</span>
                    </div>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BFA373]">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={customDept}
                        onChange={(e) => {
                          const upper = e.target.value.toUpperCase();
                          setCustomDept(upper);
                          setRegData((prev) => ({ ...prev, department: upper }));
                          if (errorMessage) setErrorMessage('');
                        }}
                        placeholder="ENTER DEPARTMENT NAME (IN CAPITAL LETTERS)"
                        className="w-full bg-[#06111F] border border-slate-700/80 focus:border-[#BFA373] focus:ring-1 focus:ring-[#BFA373]/30 rounded-xl px-3.5 py-2.5 pl-10 text-white text-sm outline-none transition-all uppercase placeholder:normal-case placeholder:text-slate-500 font-mono tracking-wide"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Class / Specialization (Conditional or when Department is selected) */}
              {(CLASS_OPTIONS_BY_DEPARTMENT[deptSelect]?.length || deptSelect === 'Others') ? (
                <div className="animate-in fade-in duration-200 space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-slate-200 block">
                    Class / Branch <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BFA373]">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <select
                      required
                      value={classSelect}
                      onChange={(e) => {
                        const newClass = e.target.value;
                        setClassSelect(newClass);
                        if (newClass === 'Others') {
                          setRegData((prev) => ({ ...prev, className: customClass.trim().toUpperCase() }));
                        } else {
                          setRegData((prev) => ({ ...prev, className: newClass }));
                        }
                        if (errorMessage) setErrorMessage('');
                      }}
                      className="w-full bg-[#06111F] border border-slate-700/80 focus:border-[#BFA373] focus:ring-1 focus:ring-[#BFA373]/30 rounded-xl px-3.5 py-2.5 pl-10 text-white text-sm outline-none transition-all cursor-pointer"
                    >
                      <option value="" className="bg-[#06111F] text-slate-400">
                        -- Select Class --
                      </option>
                      {(CLASS_OPTIONS_BY_DEPARTMENT[deptSelect] || ['Others']).map((cls) => (
                        <option key={cls} value={cls} className="bg-[#06111F] text-white">
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Class Input when 'Others' is selected */}
                  {classSelect === 'Others' && (
                    <div className="p-3.5 rounded-xl bg-[#06111F] border border-[#BFA373]/40 space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2 text-xs text-[#BFA373] font-medium">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Note: Please enter your Class / Specialization in CAPITAL LETTERS.</span>
                      </div>
                      <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BFA373]">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          value={customClass}
                          onChange={(e) => {
                            const upper = e.target.value.toUpperCase();
                            setCustomClass(upper);
                            setRegData((prev) => ({ ...prev, className: upper }));
                            if (errorMessage) setErrorMessage('');
                          }}
                          placeholder="ENTER CLASS / SPECIALIZATION (IN CAPITAL LETTERS)"
                          className="w-full bg-[#06111F] border border-slate-700/80 focus:border-[#BFA373] focus:ring-1 focus:ring-[#BFA373]/30 rounded-xl px-3.5 py-2.5 pl-10 text-white text-sm outline-none transition-all uppercase placeholder:normal-case placeholder:text-slate-500 font-mono tracking-wide"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Register / Update Submit Button */}
              <div className="pt-2 space-y-2.5">
                {authMode === 'edit_profile' ? (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#D1B079] hover:bg-[#D1B079] active:bg-[#D1B079] disabled:bg-[#D1B079]/50 text-white py-3.5 px-4 rounded-xl font-cinzel font-bold text-sm sm:text-base tracking-[0.15em] transition-all shadow-xl active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>UPDATING PROFILE...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-white" />
                        <span>UPDATE PROFILE</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#BFA373] hover:bg-[#BFA373] disabled:bg-[#BFA373]/50 text-[#06111F] py-3.5 px-4 rounded-xl font-cinzel font-bold text-sm sm:text-base tracking-[0.2em] transition-all shadow-xl active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#06111F]" />
                        <span>REGISTERING...</span>
                      </>
                    ) : (
                      <span>COMPLETE REGISTRATION</span>
                    )}
                  </button>
                )}

                <div className="text-center pt-2">
                  {authMode === 'edit_profile' ? (
                    <button
                      type="button"
                      onClick={onCancelEdit || onContinue}
                      className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Cancel and return to app
                    </button>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Already registered?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage('');
                          setAuthMode('login');
                        }}
                        className="text-[#BFA373] hover:text-[#BFA373] font-semibold underline underline-offset-2 cursor-pointer ml-1"
                      >
                        Sign in to your account
                      </button>
                    </p>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: FORGOT PASSWORD                                                   */}
        {/* ========================================================================= */}
        {authMode === 'forgot_password' && (
          <div className="bg-[#06111F] border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-2.5 mb-4 text-white">
              <div className="w-8 h-8 rounded-lg bg-[#BFA373]/15 border border-[#BFA373]/30 flex items-center justify-center text-[#BFA373]">
                <KeyRound className="w-4 h-4" />
              </div>
              <h2 className="font-cinzel text-lg font-bold">Reset Your Password</h2>
            </div>

            {resetSuccessMessage ? (
              <div className="space-y-4 text-center py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-500/60 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm text-slate-200 font-medium">{resetSuccessMessage}</p>
                <button
                  type="button"
                  onClick={() => {
                    setResetSuccessMessage('');
                    setAuthMode('login');
                  }}
                  className="w-full bg-[#D1B079] hover:bg-[#D1B079] text-white py-2.5 px-4 rounded-xl font-medium text-sm transition-all cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Enter your registered email address and we will send you password recovery instructions.
                </p>

                <div>
                  <label className="text-xs sm:text-sm font-medium text-slate-200 block mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="e.g. yourname@gmail.com"
                      className="w-full bg-[#06111F] border border-slate-700/80 focus:border-[#BFA373] focus:ring-2 focus:ring-[#BFA373]/30 rounded-xl px-3.5 py-2.5 text-white placeholder:text-slate-500 text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#BFA373] hover:bg-[#BFA373] text-[#06111F] font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#06111F]" />
                        <span>Sending reset email...</span>
                      </>
                    ) : (
                      <span>Send Reset Instructions</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage('');
                      setAuthMode('login');
                    }}
                    className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel &amp; Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="text-center mt-7">
          <p className="text-xs text-slate-500 flex items-center justify-center gap-2">
            <Database className="w-4 h-4 text-[#C5A059]" />
            <span>Secure Club Portal &bull; Firebase Cloud Sync</span>
          </p>
        </div>
      </div>

      {/* Circular Image Cropping Modal (Google/WhatsApp style) */}
      {croppingImageSrc && (
        <ImageCropModal
          imageSrc={croppingImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={handleCancelCrop}
        />
      )}
    </div>
  );
};
