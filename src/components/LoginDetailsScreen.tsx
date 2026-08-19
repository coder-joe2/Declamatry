import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { 
  saveUserLoginToFirebase, 
  authenticateMember, 
  handleGoogleSignIn, 
  triggerPasswordReset, 
  getLocalRegisteredMembers 
} from '../firebase';
import { SocietyLogo } from './SocietyLogo';
import {
  Mail,
  Phone,
  User,
  Plus,
  Camera,
  Award,
  Mic,
  Users2,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Loader2,
  Database,
  GraduationCap,
  Eye,
  EyeOff,
  Lock,
  ArrowLeft,
  KeyRound,
  ShieldCheck
} from 'lucide-react';

const YEAR_OPTIONS = ['I Year', 'II Year', 'III Year'] as const;
const DEPARTMENT_OPTIONS = ['B.Sc', 'B.A', 'B.Com', 'BBA', 'BCA'] as const;

interface LoginDetailsScreenProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onContinue: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot_password';

export const LoginDetailsScreen: React.FC<LoginDetailsScreenProps> = ({
  profile,
  onUpdateProfile,
  onContinue,
}) => {
  // Mode state: Defaults to 'login' (matching user's request)
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  // Simple Login credentials state
  const [loginIdentifier, setLoginIdentifier] = useState<string>(profile.gmail || '');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Full Registration state
  const [regData, setRegData] = useState<UserProfile>({
    name: profile.name || '',
    gmail: profile.gmail || '',
    phone: profile.phone || '',
    year: profile.year || 'I Year',
    department: profile.department || '',
    photoUrl: profile.photoUrl || '',
    password: '',
  });
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string>('');

  // Status & error indicators
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [photoError, setPhotoError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputWebRef = useRef<HTMLInputElement>(null);

  // Handle Photo upload for Registration
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setRegData((prev) => ({
            ...prev,
            photoUrl: event.target?.result as string,
          }));
          setPhotoError(false);
          setErrorMessage('');
        }
      };
      reader.readAsDataURL(file);
    }
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
        // If not found, let them register or offer direct entry
        setErrorMessage(
          result.error ||
            'Account not found. Please click "Create an account / Register" below to register your full details.'
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle Google Sign-In
  const handleGoogleAuth = async () => {
    setErrorMessage('');
    setGoogleLoading(true);
    try {
      const result = await handleGoogleSignIn();
      if (result.success && result.profile) {
        onUpdateProfile(result.profile);
        onContinue();
      } else {
        // If popup blocked or unavailable, prompt cleanly
        setErrorMessage(
          result.error ||
            'Google Sign-in was not completed. Please sign in with email or register below.'
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in error';
      setErrorMessage(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  // 3. Handle Full Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setPhotoError(false);

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

    if (!regData.password || regData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (regData.password !== regConfirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }

    if (!regData.phone.trim()) {
      setErrorMessage('Please enter your contact phone number.');
      return;
    }

    if (!regData.year?.trim()) {
      setErrorMessage('Please select your Year of Study (I Year, II Year, or III Year).');
      return;
    }

    if (!regData.department.trim()) {
      setErrorMessage('Please select your Department / Degree.');
      return;
    }

    setIsLoading(true);

    const finalProfile: UserProfile = {
      ...regData,
      name: regData.name.trim(),
      gmail: regData.gmail.trim().toLowerCase(),
      phone: regData.phone.trim(),
      isAdmin: regData.gmail.trim().toLowerCase() === 'vjana537@gmail.com',
    };

    try {
      const res = await saveUserLoginToFirebase(finalProfile);
      if (!res.success) {
        console.warn('Firebase notice:', res.error);
      }
      setSuccessMessage('Registration successful! Welcome to The Declamate’s Society.');
      setTimeout(() => {
        onUpdateProfile(finalProfile);
        onContinue();
      }, 500);
    } catch (err) {
      console.error('Registration error:', err);
      onUpdateProfile(finalProfile);
      onContinue();
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Handle Password Reset Request
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setResetSuccessMessage('');

    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await triggerPasswordReset(forgotEmail);
      setResetSuccessMessage(res.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error requesting password reset';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050B14] text-slate-100 flex flex-col justify-center selection:bg-[#22c55e] selection:text-black">
      {/* Background Ambience / Subtle Golden & Emerald Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#C5A880]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#16a34a]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto px-4 sm:px-6 py-8">
        {/* Top Official Society Crest & Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <SocietyLogo size="lg" className="shadow-2xl border-2 border-[#C5A880]/80 ring-4 ring-[#C5A880]/15" />
          </div>
          <p className="font-cinzel text-[11px] tracking-[0.3em] text-[#C5A880] font-semibold uppercase mb-0.5">
            THE
          </p>
          <h1 className="font-cinzel font-bold text-2xl sm:text-3xl tracking-[0.08em] text-white uppercase leading-none">
            DECLAMATE&apos;S SOCIETY
          </h1>
          <p className="text-[10.5px] tracking-[0.2em] text-slate-400 uppercase font-semibold mt-1">
            Public Speaking &amp; Leadership Club
          </p>
        </div>

        {/* Global Error Notice Alert */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs sm:text-sm flex items-center gap-2.5 shadow-lg animate-shake">
            <AlertCircle className="w-4.5 h-4.5 shrink-0 text-red-400" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Global Success Notice Alert */}
        {successMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs sm:text-sm flex items-center gap-2.5 shadow-lg">
            <CheckCircle2 className="w-4.5 h-4.5 shrink-0 text-emerald-400" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: SIMPLE SIGN-IN (Matches the user's uploaded image exactly)        */}
        {/* ========================================================================= */}
        {authMode === 'login' && (
          <div className="bg-[#090F1D] border border-slate-800/80 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-md">
            <form onSubmit={handleSignIn} className="space-y-4">
              {/* 1. Username or email address field */}
              <div>
                <label className="text-sm font-medium text-slate-200 block mb-1.5 text-left">
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
                    className="w-full bg-[#030712] border border-slate-700/80 focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/30 rounded-xl px-3.5 py-3 text-white placeholder:text-slate-500 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              {/* 2. Password field with Forgot password? on the right */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-slate-200">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage('');
                      setForgotEmail(loginIdentifier);
                      setAuthMode('forgot_password');
                    }}
                    className="text-xs text-[#38bdf8] hover:text-[#60a5fa] hover:underline font-medium cursor-pointer transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Enter your password"
                    className="w-full bg-[#030712] border border-slate-700/80 focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/30 rounded-xl px-3.5 py-3 pr-11 text-white placeholder:text-slate-500 text-sm outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4.5 h-4.5" />
                    ) : (
                      <Eye className="w-4.5 h-4.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* 3. Primary Green "Sign in" Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#16a34a] hover:bg-[#15803d] active:bg-[#166534] disabled:bg-[#16a34a]/50 text-white py-3 px-4 rounded-xl font-semibold text-sm sm:text-base tracking-wide transition-all shadow-lg hover:shadow-emerald-900/30 active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Sign in</span>
                  )}
                </button>
              </div>

              {/* 4. Divider: or */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative bg-[#090F1D] px-3 text-xs text-slate-400 uppercase tracking-wider font-medium">
                  or
                </div>
              </div>

              {/* 5. Continue with Google Button */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={googleLoading || isLoading}
                className="w-full bg-[#0E1726] hover:bg-[#152238] border border-slate-700/80 active:scale-[0.99] text-slate-100 py-3 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-3 shadow-md cursor-pointer disabled:opacity-50"
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                ) : (
                  <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>

              {/* 6. Switch to Registration Link */}
              <div className="pt-3 text-center">
                <p className="text-xs sm:text-sm text-slate-400">
                  New member?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage('');
                      setSuccessMessage('');
                      setAuthMode('register');
                    }}
                    className="text-[#C5A880] hover:text-[#e0c39c] font-semibold underline underline-offset-4 cursor-pointer transition-colors"
                  >
                    Register / Create an account
                  </button>
                </p>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: REGISTRATION FORM (Full Name, Email, Password, Phone, Year, Dept) */}
        {/* ========================================================================= */}
        {authMode === 'register' && (
          <div className="bg-[#090F1D] border border-[#C5A880]/40 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-3">
              <div>
                <h2 className="font-cinzel text-lg sm:text-xl font-bold text-white uppercase tracking-wide">
                  Member Registration
                </h2>
                <p className="text-xs text-[#C5A880]">Join The Declamate&apos;s Society</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  setAuthMode('login');
                }}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign in</span>
              </button>
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
                          : 'border-[#C5A880] bg-[#030712]'
                      } flex items-center justify-center cursor-pointer shadow-lg hover:scale-105 transition-all overflow-hidden relative group`}
                    >
                      {regData.photoUrl ? (
                        <img
                          src={regData.photoUrl}
                          alt="Profile preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Camera className={`w-7 h-7 ${photoError ? 'text-red-400' : 'text-[#C5A880]'}`} />
                      )}

                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-5 h-5 text-white" />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`absolute bottom-0 right-0 w-6 h-6 rounded-full ${
                        photoError ? 'bg-red-500' : 'bg-[#C5A880] hover:bg-[#d8bb94]'
                      } text-[#0A192F] flex items-center justify-center border-2 border-[#090F1D] shadow-md transition-colors`}
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
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C5A880]">
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
                    className="w-full bg-[#030712] border border-slate-700/80 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880]/30 rounded-xl px-3.5 py-2.5 pl-10 text-white placeholder:text-slate-500 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-slate-200 block mb-1">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C5A880]">
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
                    className="w-full bg-[#030712] border border-slate-700/80 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880]/30 rounded-xl px-3.5 py-2.5 pl-10 text-white placeholder:text-slate-500 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password & Confirm Password Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-200 block mb-1">
                    Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={regData.password || ''}
                      onChange={(e) => {
                        setRegData({ ...regData, password: e.target.value });
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="Min 6 chars"
                      className="w-full bg-[#030712] border border-slate-700/80 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880]/30 rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 text-xs sm:text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-200 block mb-1">
                    Confirm Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={regConfirmPassword}
                      onChange={(e) => {
                        setRegConfirmPassword(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="Re-type password"
                      className="w-full bg-[#030712] border border-slate-700/80 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880]/30 rounded-xl px-3 py-2.5 text-white placeholder:text-slate-500 text-xs sm:text-sm outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Show password toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="toggleShowRegPass"
                  checked={showRegPassword}
                  onChange={(e) => setShowRegPassword(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-[#C5A880] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="toggleShowRegPass" className="text-xs text-slate-400 cursor-pointer">
                  Show passwords
                </label>
              </div>

              {/* Phone Number */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-slate-200 block mb-1">
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C5A880]">
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
                    className="w-full bg-[#030712] border border-slate-700/80 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880]/30 rounded-xl px-3.5 py-2.5 pl-10 text-white placeholder:text-slate-500 text-sm outline-none transition-all"
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
                            ? 'bg-[#C5A880] text-[#0A192F] border-[#C5A880] shadow-md font-bold'
                            : 'bg-[#030712] text-slate-300 border-slate-800 hover:border-[#C5A880]/50'
                        }`}
                      >
                        {yr}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-slate-200 block mb-1">
                  Department / Degree <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C5A880]">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <select
                    required
                    value={regData.department}
                    onChange={(e) => {
                      setRegData({ ...regData, department: e.target.value });
                      if (errorMessage) setErrorMessage('');
                    }}
                    className="w-full bg-[#030712] border border-slate-700/80 focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880]/30 rounded-xl px-3.5 py-2.5 pl-10 text-white text-sm outline-none transition-all cursor-pointer"
                  >
                    <option value="" className="bg-[#030712] text-slate-400">
                      -- Select Department --
                    </option>
                    {DEPARTMENT_OPTIONS.map((dept) => (
                      <option key={dept} value={dept} className="bg-[#030712] text-white">
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Register Submit Button */}
              <div className="pt-2 space-y-2.5">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#C5A880] hover:bg-[#d8bb94] disabled:bg-[#C5A880]/50 text-[#0A192F] py-3.5 px-4 rounded-xl font-cinzel font-bold text-sm sm:text-base tracking-[0.2em] transition-all shadow-xl active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#0A192F]" />
                      <span>REGISTERING...</span>
                    </>
                  ) : (
                    <span>COMPLETE REGISTRATION</span>
                  )}
                </button>

                <div className="text-center pt-2">
                  <p className="text-xs text-slate-400">
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage('');
                        setAuthMode('login');
                      }}
                      className="text-[#C5A880] hover:text-[#e0c39c] font-semibold underline underline-offset-2 cursor-pointer"
                    >
                      Sign in to your account
                    </button>
                  </p>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: FORGOT PASSWORD                                                   */}
        {/* ========================================================================= */}
        {authMode === 'forgot_password' && (
          <div className="bg-[#090F1D] border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-2.5 mb-4 text-white">
              <div className="w-8 h-8 rounded-lg bg-[#38bdf8]/15 border border-[#38bdf8]/30 flex items-center justify-center text-[#38bdf8]">
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
                  className="w-full bg-[#16a34a] hover:bg-[#15803d] text-white py-2.5 px-4 rounded-xl font-medium text-sm transition-all cursor-pointer"
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
                      className="w-full bg-[#030712] border border-slate-700/80 focus:border-[#38bdf8] focus:ring-2 focus:ring-[#38bdf8]/30 rounded-xl px-3.5 py-2.5 text-white placeholder:text-slate-500 text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#38bdf8] hover:bg-[#0284c7] text-[#0A192F] font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#0A192F]" />
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
        <div className="text-center mt-6">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>Secure Club Portal &bull; Firebase Cloud Sync</span>
          </p>
        </div>
      </div>
    </div>
  );
};
