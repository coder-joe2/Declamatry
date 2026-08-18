import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';
import { saveUserLoginToFirebase } from '../firebase';
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
  CalendarDays,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';

const YEAR_OPTIONS = ['I Year', 'II Year', 'III Year'] as const;
const DEPARTMENT_OPTIONS = ['B.Sc', 'B.A', 'B.Com', 'BBA', 'BCA'] as const;

interface LoginDetailsScreenProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onContinue: () => void;
}

export const LoginDetailsScreen: React.FC<LoginDetailsScreenProps> = ({
  profile,
  onUpdateProfile,
  onContinue,
}) => {
  const [formData, setFormData] = useState<UserProfile>({
    name: profile.name || '',
    gmail: profile.gmail || '',
    phone: profile.phone || '',
    year: profile.year || '',
    department: profile.department || '',
    photoUrl: profile.photoUrl || '',
  });

  const [errorMessage, setErrorMessage] = useState<string>('');
  const [photoError, setPhotoError] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputWebRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData((prev) => ({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setPhotoError(false);

    if (!formData.photoUrl) {
      setPhotoError(true);
      setErrorMessage('Profile picture is mandatory. Please upload a photo to continue.');
      return;
    }

    if (!formData.name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!formData.gmail.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (!formData.phone.trim()) {
      setErrorMessage('Please enter your phone number.');
      return;
    }

    if (!formData.year?.trim()) {
      setErrorMessage('Please select your Year of Study (I Year, II Year, or III Year).');
      return;
    }

    if (!formData.department.trim()) {
      setErrorMessage('Please select your Department (B.Sc, B.A, B.Com, BBA, BCA).');
      return;
    }

    setIsSubmitting(true);

    const finalProfile: UserProfile = {
      ...formData,
      isAdmin: formData.gmail.trim().toLowerCase() === 'vjana537@gmail.com',
    };

    try {
      // Store user login details in Firebase Firestore (declamate-af92e)
      const res = await saveUserLoginToFirebase(finalProfile);
      if (!res.success) {
        console.warn('Firebase sync notice:', res.error);
      }
    } catch (err) {
      console.error('Firebase error on login:', err);
    } finally {
      setIsSubmitting(false);
      onUpdateProfile(finalProfile);
      onContinue();
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#030712] text-slate-100 flex flex-col selection:bg-[#C5A880] selection:text-[#0A192F]">
      {/* ========================================================================= */}
      {/* 1. MOBILE VIEW - Full Screen Luxury Black & Gold Theme                    */}
      {/* ========================================================================= */}
      <div className="view-mobile-layout w-full min-h-screen bg-gradient-to-b from-[#030712] via-[#08101E] to-[#030712] relative overflow-hidden flex flex-col justify-between p-6 sm:p-8">
        {/* Background Delicate Golden Waves */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-20"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 430 900"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M 290 0 C 305 140 400 320 410 500 C 420 680 340 800 130 900"
            stroke="#C5A880"
            strokeWidth="1.2"
          />
          <path
            d="M 315 0 C 330 160 420 340 425 520 C 430 700 310 820 100 900"
            stroke="#C5A880"
            strokeWidth="1"
          />
          <path
            d="M 340 0 C 355 180 440 360 438 540 C 435 720 280 840 70 900"
            stroke="#C5A880"
            strokeWidth="0.8"
          />
          <path
            d="M 0 540 C 110 610 170 710 185 900"
            stroke="#C5A880"
            strokeWidth="1.1"
          />
        </svg>

        {/* Top Left Corner Official Society Logo Badge */}
        <div className="absolute top-4 left-4 sm:top-5 sm:left-5 z-30">
          <SocietyLogo size="md" className="shadow-2xl border-2 border-[#C5A880]/70 ring-2 ring-[#C5A880]/20" />
        </div>

        {/* Mobile View Content */}
        <div className="relative z-10 w-full max-w-md mx-auto flex-1 flex flex-col justify-between py-2">
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between">
            {/* Top Brand Header */}
            <div className="text-center pt-2">
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#112240] text-[#C5A880] mb-2 shadow-md border border-[#C5A880]/40">
                <Award className="w-4.5 h-4.5" />
              </div>
              <p className="font-cinzel text-[11px] sm:text-[12px] tracking-[0.3em] text-[#C5A880] font-semibold uppercase mb-0.5">
                THE
              </p>
              <h1 className="font-cinzel font-bold text-[28px] sm:text-[32px] tracking-[0.06em] text-white uppercase leading-none">
                DECLAMATE&apos;S
              </h1>
              <h2 className="font-cinzel font-bold text-[28px] sm:text-[32px] tracking-[0.12em] text-[#C5A880] uppercase leading-tight mb-2.5">
                SOCIETY
              </h2>
              <p className="font-sans font-bold text-[10px] tracking-[0.2em] text-slate-300 uppercase mb-4">
                A PUBLIC SPEAKING &amp; LEADERSHIP CLUB
              </p>

              {/* Tagline Ribbon Banner */}
              <div className="flex justify-center mb-4 px-1">
                <div className="w-full max-w-xs bg-[#0E1E38] border border-[#C5A880]/50 py-2.5 px-6 ribbon-banner flex items-center justify-between text-white shadow-xl">
                  <span className="text-[11px] font-semibold tracking-[0.2em] text-[#C5A880]">
                    SPEAK
                  </span>
                  <span className="text-[11px] font-semibold tracking-[0.2em] text-white">
                    LEAD
                  </span>
                  <span className="text-[11px] font-semibold tracking-[0.2em] text-[#C5A880]">
                    INSPIRE
                  </span>
                </div>
              </div>
            </div>

            {/* Error Notification Alert */}
            {errorMessage && (
              <div className="mb-3 p-3 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Profile Picture Section (Compulsory) */}
            <div className="mb-3">
              <div className="flex items-center justify-center gap-1.5 mb-1.5">
                <h3 className="font-playfair text-[19px] text-white font-normal tracking-tight text-center">
                  Profile Picture <span className="text-red-400 font-bold">*</span>
                </h3>
              </div>
              <p className="text-center text-[10.5px] text-slate-400 mb-2 font-medium">
                Photo is mandatory for your official speaking badge
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
                    title="Click to upload profile picture"
                    className={`w-24 h-24 rounded-full border-[3px] ${
                      photoError
                        ? 'border-red-500 ring-4 ring-red-500/30 bg-red-950/40'
                        : formData.photoUrl
                        ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                        : 'border-[#C5A880] bg-[#0E1E38]'
                    } flex items-center justify-center cursor-pointer shadow-xl hover:scale-105 transition-all overflow-hidden relative group`}
                  >
                    {formData.photoUrl ? (
                      <img
                        src={formData.photoUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-[#C5A880]">
                        <Camera className={`w-9 h-9 stroke-[1.5] ${photoError ? 'text-red-400' : ''}`} />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                      <Camera className="w-6 h-6 text-white drop-shadow" />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`absolute bottom-0 right-0 w-6 h-6 rounded-full ${
                      photoError ? 'bg-red-500' : 'bg-[#C5A880] hover:bg-[#d8bb94]'
                    } text-[#0A192F] flex items-center justify-center border-2 border-[#030712] shadow-md transition-colors`}
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Input Fields */}
            <div className="space-y-3 mb-3">
              {/* Name */}
              <div>
                <label className="font-playfair text-[16px] text-slate-200 font-normal tracking-tight mb-1 block text-left">
                  Full Name <span className="text-red-400 font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C5A880] pointer-events-none">
                    <User className="w-4 h-4 stroke-[1.75]" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Enter your name"
                    className="w-full bg-[#0B1528] border border-[#1E2E48] rounded-xl px-3.5 py-2.5 pl-10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880]/30 transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="font-playfair text-[16px] text-slate-200 font-normal tracking-tight mb-1 block text-left">
                  Email <span className="text-red-400 font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C5A880] pointer-events-none">
                    <Mail className="w-4 h-4 stroke-[1.75]" />
                  </div>
                  <input
                    type="email"
                    required
                    value={formData.gmail}
                    onChange={(e) => {
                      setFormData({ ...formData, gmail: e.target.value });
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Enter your email"
                    className="w-full bg-[#0B1528] border border-[#1E2E48] rounded-xl px-3.5 py-2.5 pl-10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880]/30 transition-all"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="font-playfair text-[16px] text-slate-200 font-normal tracking-tight mb-1 block text-left">
                  Phone Number <span className="text-red-400 font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C5A880] pointer-events-none">
                    <Phone className="w-4 h-4 stroke-[1.75]" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Enter phone number"
                    className="w-full bg-[#0B1528] border border-[#1E2E48] rounded-xl px-3.5 py-2.5 pl-10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880]/30 transition-all"
                  />
                </div>
              </div>

              {/* Year of Study */}
              <div>
                <label className="font-playfair text-[15px] text-slate-200 font-normal tracking-tight mb-1 block text-left">
                  Year of Study <span className="text-red-400 font-bold">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {YEAR_OPTIONS.map((yr) => {
                    const isSelected = formData.year === yr;
                    return (
                      <button
                        type="button"
                        key={yr}
                        onClick={() => {
                          setFormData({ ...formData, year: yr });
                          if (errorMessage) setErrorMessage('');
                        }}
                        className={`py-2 px-2 rounded-xl text-xs font-semibold tracking-wide border transition-all cursor-pointer text-center ${
                          isSelected
                            ? 'bg-[#C5A880] text-[#0A192F] border-[#C5A880] shadow-md font-bold scale-[1.02]'
                            : 'bg-[#0B1528] text-slate-300 border-[#1E2E48] hover:border-[#C5A880]/60'
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
                <label className="font-playfair text-[15px] text-slate-200 font-normal tracking-tight mb-1 block text-left">
                  Department <span className="text-red-400 font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C5A880] pointer-events-none">
                    <GraduationCap className="w-4 h-4 stroke-[1.75]" />
                  </div>
                  <select
                    required
                    value={formData.department}
                    onChange={(e) => {
                      setFormData({ ...formData, department: e.target.value });
                      if (errorMessage) setErrorMessage('');
                    }}
                    className="w-full bg-[#0B1528] border border-[#1E2E48] rounded-xl px-3.5 py-2.5 pl-10 text-white text-sm focus:outline-none focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880]/30 transition-all cursor-pointer"
                  >
                    <option value="" className="bg-[#0B1528] text-slate-400">-- Select Department / Degree --</option>
                    {DEPARTMENT_OPTIONS.map((d) => (
                      <option key={d} value={d} className="bg-[#0B1528] text-white">
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Login Button */}
            <div className="pt-2 pb-2 space-y-2.5">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#C5A880] hover:bg-[#d8bb94] disabled:bg-[#C5A880]/50 disabled:cursor-not-allowed text-[#0A192F] py-3.5 px-6 rounded-xl font-cinzel font-bold text-base tracking-[0.25em] transition-all shadow-lg active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-[#0A192F]" />
                    <span>SAVING TO FIREBASE...</span>
                  </>
                ) : (
                  <span>LOGIN</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. WEBSITE / LAPTOP FULL-SCREEN VIEW (Dark Luxury Split Layout)           */}
      {/* ========================================================================= */}
      <div className="view-desktop-layout w-full min-h-screen">
        <div className="w-full min-h-screen grid grid-cols-1 md:grid-cols-12 bg-[#030712] m-0 p-0 border-none rounded-none shadow-none">
          {/* Left Showcase Hero Column - Full Height 100% */}
          <div className="md:col-span-5 lg:col-span-5 xl:col-span-5 bg-gradient-to-br from-[#02050B] via-[#0A192F] to-[#040914] text-white p-8 lg:p-12 xl:p-16 relative flex flex-col justify-between min-h-screen overflow-hidden border-r border-[#1E2E48]">
            {/* Background Artistic Gold Waves for Laptop */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 500 800"
              preserveAspectRatio="none"
              fill="none"
            >
              <path
                d="M 250 0 C 350 200 480 350 490 600 C 500 850 350 750 200 800"
                stroke="#C5A880"
                strokeWidth="1.5"
              />
              <path
                d="M 300 0 C 400 220 520 370 510 620 C 500 870 300 780 150 800"
                stroke="#C5A880"
                strokeWidth="1"
              />
            </svg>

            {/* Glowing Top Crest */}
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4">
                <SocietyLogo size="lg" className="shadow-2xl border-2 border-[#C5A880]/70" />
                <div>
                  <h2 className="font-cinzel font-bold text-xl lg:text-2xl text-white tracking-widest uppercase">
                    The Declamate&apos;s
                  </h2>
                  <p className="text-xs font-semibold tracking-widest text-[#C5A880] uppercase">
                    Public Speaking &amp; Leadership Club
                  </p>
                </div>
              </div>

              <div className="pt-6 space-y-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C5A880]/15 border border-[#C5A880]/40 text-[#C5A880] text-xs font-semibold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Sri Amaraavathi College &bull; Karur</span>
                </div>

                <h1 className="font-cinzel text-3xl lg:text-4xl font-extrabold text-white leading-tight">
                  Speak with Poise. <br />
                  <span className="text-[#C5A880]">Lead with Impact.</span>
                </h1>

                <p className="text-slate-300 text-sm lg:text-base leading-relaxed max-w-md font-sans">
                  Join our exclusive fraternity of student speakers, debaters, and visionary leaders.
                </p>
              </div>

              {/* 3 Core Highlights */}
              <div className="pt-4 space-y-3 max-w-sm">
                <div className="flex items-center gap-3 text-slate-200 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-[#C5A880]/15 border border-[#C5A880]/30 text-[#C5A880] flex items-center justify-center shrink-0">
                    <Mic className="w-4 h-4" />
                  </div>
                  <span>Master Keynote &amp; Impromptu Speeches</span>
                </div>
                <div className="flex items-center gap-3 text-slate-200 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-[#C5A880]/15 border border-[#C5A880]/30 text-[#C5A880] flex items-center justify-center shrink-0">
                    <Users2 className="w-4 h-4" />
                  </div>
                  <span>Student-Led Constructive Feedback</span>
                </div>
                <div className="flex items-center gap-3 text-slate-200 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-[#C5A880]/15 border border-[#C5A880]/30 text-[#C5A880] flex items-center justify-center shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <span>5-Level Presentation Mastery Pathway</span>
                </div>
              </div>
            </div>

            {/* Bottom Tagline Ribbon */}
            <div className="relative z-10 pt-6">
              <div className="bg-[#030712]/90 border border-[#C5A880]/40 rounded-xl p-4 flex items-center justify-between text-xs font-cinzel font-bold tracking-[0.2em] text-[#C5A880]">
                <span>SPEAK</span>
                <span>&bull;</span>
                <span>LEAD</span>
                <span>&bull;</span>
                <span>INSPIRE</span>
              </div>
            </div>
          </div>

          {/* Right Column: Member Login Form */}
          <div className="md:col-span-7 lg:col-span-7 xl:col-span-7 bg-[#050B14] p-8 lg:p-14 xl:p-20 flex flex-col justify-center min-h-screen text-slate-100">
            <div className="max-w-xl w-full mx-auto space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#C5A880] font-cinzel">
                  Official Portal
                </span>
                <h3 className="font-cinzel text-2xl lg:text-3xl xl:text-4xl font-bold text-white uppercase tracking-wide mt-1">
                  Member Login
                </h3>
                <p className="text-sm text-slate-400 font-medium mt-1">
                  Enter your credentials and upload your member picture to enter the dashboard
                </p>
              </div>

              {/* Error Notification Alert */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-sm flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
              )}

              {/* Profile Picture Uploader on Full-Screen Desktop (Compulsory) */}
              <div
                className={`p-5 rounded-2xl border transition-all flex items-center gap-5 ${
                  photoError
                    ? 'bg-red-950/40 border-red-500/60 ring-2 ring-red-500/30'
                    : formData.photoUrl
                    ? 'bg-emerald-950/20 border-emerald-500/50'
                    : 'bg-[#0B1528] border-[#1E2E48]'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputWebRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  className="hidden"
                />

                <div className="relative">
                  <div
                    onClick={() => fileInputWebRef.current?.click()}
                    title="Click to choose profile picture"
                    className={`w-20 h-20 rounded-full border-2 ${
                      photoError
                        ? 'border-red-500 ring-4 ring-red-500/30'
                        : formData.photoUrl
                        ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                        : 'border-[#C5A880]'
                    } bg-[#030712] flex items-center justify-center cursor-pointer shadow-md hover:scale-105 transition-transform overflow-hidden relative group`}
                  >
                    {formData.photoUrl ? (
                      <img
                        src={formData.photoUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera className={`w-8 h-8 ${photoError ? 'text-red-400' : 'text-[#C5A880]'} stroke-[1.5]`} />
                    )}

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputWebRef.current?.click()}
                    className={`absolute bottom-0 right-0 w-6 h-6 rounded-full ${
                      photoError ? 'bg-red-500' : 'bg-[#C5A880] hover:bg-[#d8bb94]'
                    } text-[#0A192F] flex items-center justify-center border-2 border-[#030712] shadow-md transition-colors`}
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                </div>

                <div>
                  <h4 className="font-playfair text-lg text-white font-semibold flex items-center gap-1.5">
                    Profile Picture <span className="text-red-400 font-bold text-sm">* Mandatory</span>
                  </h4>
                  <p className="text-xs text-slate-400 mb-1.5">
                    {formData.photoUrl
                      ? '✓ Profile picture uploaded successfully'
                      : 'Upload a clear headshot (required for login & speaking ID badge)'}
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputWebRef.current?.click()}
                    className="text-xs font-semibold text-[#C5A880] hover:underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    Browse file from device
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Input Fields */}
                <div className="space-y-4">
                  {/* Name Field */}
                  <div>
                    <label className="font-playfair text-[17px] text-slate-200 font-medium tracking-tight mb-1.5 block">
                      Full Name <span className="text-red-400 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C5A880] pointer-events-none">
                        <User className="w-4 h-4 stroke-[1.75]" />
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          if (errorMessage) setErrorMessage('');
                        }}
                        placeholder="e.g. Alex Morgan"
                        className="w-full bg-[#0B1528] border border-[#1E2E48] rounded-xl px-4 py-3 pl-11 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Email Field */}
                  <div>
                    <label className="font-playfair text-[17px] text-slate-200 font-medium tracking-tight mb-1.5 block">
                      Gmail / Email Address <span className="text-red-400 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C5A880] pointer-events-none">
                        <Mail className="w-4 h-4 stroke-[1.75]" />
                      </div>
                      <input
                        type="email"
                        required
                        value={formData.gmail}
                        onChange={(e) => {
                          setFormData({ ...formData, gmail: e.target.value });
                          if (errorMessage) setErrorMessage('');
                        }}
                        placeholder="e.g. alex.morgan@gmail.com"
                        className="w-full bg-[#0B1528] border border-[#1E2E48] rounded-xl px-4 py-3 pl-11 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Phone Field */}
                  <div>
                    <label className="font-playfair text-[17px] text-slate-200 font-medium tracking-tight mb-1.5 block">
                      Phone Number <span className="text-red-400 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C5A880] pointer-events-none">
                        <Phone className="w-4 h-4 stroke-[1.75]" />
                      </div>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value });
                          if (errorMessage) setErrorMessage('');
                        }}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full bg-[#0B1528] border border-[#1E2E48] rounded-xl px-4 py-3 pl-11 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Year of Study Field */}
                  <div>
                    <label className="font-playfair text-[17px] text-slate-200 font-medium tracking-tight mb-1.5 block">
                      Year of Study <span className="text-red-400 font-bold">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {YEAR_OPTIONS.map((yr) => {
                        const isSelected = formData.year === yr;
                        return (
                          <button
                            type="button"
                            key={yr}
                            onClick={() => {
                              setFormData({ ...formData, year: yr });
                              if (errorMessage) setErrorMessage('');
                            }}
                            className={`py-3 px-3 rounded-xl text-sm font-semibold tracking-wide border transition-all cursor-pointer text-center ${
                              isSelected
                                ? 'bg-[#C5A880] text-[#0A192F] border-[#C5A880] shadow-md font-bold scale-[1.02]'
                                : 'bg-[#0B1528] text-slate-300 border-[#1E2E48] hover:border-[#C5A880]/60'
                            }`}
                          >
                            {yr}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Department Field */}
                  <div>
                    <label className="font-playfair text-[17px] text-slate-200 font-medium tracking-tight mb-1.5 block">
                      Department / Degree <span className="text-red-400 font-bold">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C5A880] pointer-events-none">
                        <GraduationCap className="w-4 h-4 stroke-[1.75]" />
                      </div>
                      <select
                        required
                        value={formData.department}
                        onChange={(e) => {
                          setFormData({ ...formData, department: e.target.value });
                          if (errorMessage) setErrorMessage('');
                        }}
                        className="w-full bg-[#0B1528] border border-[#1E2E48] rounded-xl px-4 py-3 pl-11 text-white text-sm focus:outline-none focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/20 transition-all cursor-pointer"
                      >
                        <option value="" className="bg-[#0B1528] text-slate-400">-- Select Department / Degree --</option>
                        {DEPARTMENT_OPTIONS.map((d) => (
                          <option key={d} value={d} className="bg-[#0B1528] text-white">
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-3 space-y-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#C5A880] hover:bg-[#d8bb94] disabled:bg-[#C5A880]/50 disabled:cursor-not-allowed text-[#0A192F] py-4 px-8 rounded-xl font-cinzel font-bold text-base lg:text-lg tracking-[0.25em] transition-all shadow-xl hover:shadow-2xl active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-[#0A192F]" />
                        <span>SAVING DETAILS TO FIREBASE...</span>
                      </>
                    ) : (
                      <span>ENTER SOCIETY DASHBOARD</span>
                    )}
                  </button>

                  <p className="text-center text-xs text-slate-400 mt-2 flex items-center justify-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-[#C5A880]" />
                    <span>Connected to Firebase Firestore (declamate-af92e)</span>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
