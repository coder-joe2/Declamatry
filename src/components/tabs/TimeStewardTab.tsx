import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  UserProfile,
  TimeStewardRecord,
  RegisteredMember,
  formatSpeakerRole,
} from '../../types';
import { SocietyLogo } from '../SocietyLogo';
import {
  saveTimeStewardRecord,
  subscribeToTimeStewardRecords,
  deleteTimeStewardRecord,
  subscribeToRegisteredMembers,
  sendAppMessage,
} from '../../firebase';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  X,
  User,
  Calendar,
  Send,
  ArrowRight,
  ArrowLeft,
  Clock,
  History,
  Trash2,
  FileCheck,
  Folder,
  Mic,
  AlertCircle,
  Copy,
  Check,
  FileText,
  Sparkles,
  Users,
  Award,
} from 'lucide-react';

interface TimeStewardTabProps {
  userProfile: UserProfile;
}

export const TimeStewardTab: React.FC<TimeStewardTabProps> = ({ userProfile }) => {
  // Step 1 vs Step 2 state
  const [step, setStep] = useState<'form' | 'timer'>('form');

  // Form fields
  const [members, setMembers] = useState<RegisteredMember[]>([]);
  const [speakerName, setSpeakerName] = useState<string>('');
  const [speakerEmail, setSpeakerEmail] = useState<string>('');
  const [speakerRole, setSpeakerRole] = useState<string>('');
  const [speechTitle, setSpeechTitle] = useState<string>('');
  const [meetingNumber, setMeetingNumber] = useState<string>('1st Meeting');
  const [notes, setNotes] = useState<string>('');

  const [speakerDepartment, setSpeakerDepartment] = useState<string>('');
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});

  const isRoleExpanded = (role: string) => {
    return expandedRoles[role] !== false; // default expanded
  };

  const toggleRole = (role: string) => {
    setExpandedRoles((prev) => ({
      ...prev,
      [role]: !isRoleExpanded(role),
    }));
  };

  // Dropdown UI
  const [showSpeakerDropdown, setShowSpeakerDropdown] = useState<boolean>(false);

  // Timer state
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const timerIntervalRef = useRef<number | null>(null);

  // Persistence & History & Report
  const [records, setRecords] = useState<TimeStewardRecord[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportMeetingFilter, setReportMeetingFilter] = useState<string>('all');
  const [reportViewMode, setReportViewMode] = useState<'cards' | 'script'>('cards');
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [submittedSuccessRecord, setSubmittedSuccessRecord] = useState<TimeStewardRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<TimeStewardRecord | null>(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState<boolean>(false);

  // Load members
  useEffect(() => {
    const unsub = subscribeToRegisteredMembers((data) => {
      setMembers(data);
    });
    return () => unsub();
  }, []);

  // Subscribe to all time steward records
  useEffect(() => {
    const unsub = subscribeToTimeStewardRecords((data) => {
      setRecords(data);
    });
    return () => unsub();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleDeleteClick = (rec: TimeStewardRecord) => {
    setRecordToDelete(rec);
  };

  const handleExecuteDelete = async () => {
    if (!recordToDelete) return;
    setIsDeletingRecord(true);
    const target = recordToDelete;

    // Optimistically update records in memory immediately
    setRecords((prev) =>
      prev.filter((r) => {
        if (target.id && r.id && r.id === target.id) return false;
        if (target.createdAt && r.createdAt && r.createdAt === target.createdAt && r.speakerName === target.speakerName) {
          return false;
        }
        if (
          r.speakerName === target.speakerName &&
          r.formattedTime === target.formattedTime &&
          r.meetingNumber === target.meetingNumber
        ) {
          return false;
        }
        return true;
      })
    );

    try {
      await deleteTimeStewardRecord(target);
      showToast(`Timing record for "${target.speakerName}" deleted.`);
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Failed to delete timing record.');
    } finally {
      setIsDeletingRecord(false);
      setRecordToDelete(null);
    }
  };

  // Helper to extract clean roles for a member
  const getMemberRoles = (m: RegisteredMember): string[] => {
    const raw: string[] = [];
    if (Array.isArray(m.speakerRoles)) raw.push(...m.speakerRoles);
    if (typeof m.speakerRole === 'string' && m.speakerRole.trim()) {
      raw.push(...m.speakerRole.split(','));
    }
    return raw
      .map((r) => formatSpeakerRole(r).trim())
      .filter(Boolean);
  };

  // Appointed speakers appointed by Admin into ANY speaker role
  const appointedSpeakers = useMemo(() => {
    return members.filter((m) => getMemberRoles(m).length > 0);
  }, [members]);

  // Group appointed members into their respective appointed roles
  const rolesWithMembers = useMemo(() => {
    const roleMap = new Map<string, RegisteredMember[]>();

    // Standard list of roles to prioritize
    const standardOrder = [
      'Key Note Speaker',
      'Role Player',
      'Evaluator (Feedbacker)',
      'Quick Think Speaker',
      'Filler Counter',
      'Time Steward',
    ];

    standardOrder.forEach((r) => {
      roleMap.set(r, []);
    });

    appointedSpeakers.forEach((m) => {
      const mRoles = getMemberRoles(m);
      mRoles.forEach((r) => {
        const formatted = formatSpeakerRole(r) || r;
        if (!roleMap.has(formatted)) {
          roleMap.set(formatted, []);
        }
        const list = roleMap.get(formatted)!;
        if (!list.some((existing) => (existing.id && existing.id === m.id) || (existing.name === m.name && existing.gmail === m.gmail))) {
          list.push(m);
        }
      });
    });

    const query = speakerName.toLowerCase().trim();
    const result: { role: string; members: RegisteredMember[] }[] = [];

    roleMap.forEach((memberList, roleName) => {
      const filtered = query
        ? memberList.filter((m) => {
            const deptStr = [m.department, m.year ? `(${m.year})` : ''].filter(Boolean).join(' ');
            return (
              (m.name || '').toLowerCase().includes(query) ||
              deptStr.toLowerCase().includes(query) ||
              roleName.toLowerCase().includes(query)
            );
          })
        : memberList;

      if (filtered.length > 0) {
        result.push({ role: roleName, members: filtered });
      }
    });

    return result;
  }, [appointedSpeakers, speakerName]);

  // Convert seconds to natural spoken English words (e.g. 5 minutes and 42 seconds)
  const formatSecondsToSpokenWords = (totalSec: number): string => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    if (mins === 0) {
      return `${secs} ${secs === 1 ? 'second' : 'seconds'}`;
    }
    if (secs === 0) {
      return `${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
    }
    return `${mins} ${mins === 1 ? 'minute' : 'minutes'} and ${secs} ${secs === 1 ? 'second' : 'seconds'}`;
  };

  // Stopwatch ticking logic
  useEffect(() => {
    if (isRunning) {
      timerIntervalRef.current = window.setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isRunning]);

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleRestart = () => {
    setIsRunning(false);
    setSecondsElapsed(0);
    showToast('Timer restarted to 00:00');
  };

  // Format MM:SS
  const formatTimerDigits = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const padMin = String(mins).padStart(2, '0');
    const padSec = String(secs).padStart(2, '0');
    return `${padMin}:${padSec}`;
  };

  // Determine Toastmasters status for 5-7 min keynote speech
  const getTimingStatus = (sec: number): 'normal' | 'green' | 'amber' | 'red' => {
    if (sec >= 420) return 'red'; // 7 min +
    if (sec >= 360) return 'amber'; // 6 min
    if (sec >= 300) return 'green'; // 5 min
    return 'normal';
  };

  const timingStatus = getTimingStatus(secondsElapsed);

  // Helper to check if timing for a member is already stored
  const getStoredRecordForMember = (member: { name?: string; gmail?: string }) => {
    if (!member.name && !member.gmail) return null;
    const curMeeting = (meetingNumber || '').trim().toLowerCase();
    return records.find((r) => {
      const nameMatches = Boolean(
        member.name &&
        (r.speakerName || '').trim().toLowerCase() === member.name.trim().toLowerCase()
      );
      const emailMatches = Boolean(
        member.gmail &&
        r.speakerEmail &&
        r.speakerEmail.trim().toLowerCase() === member.gmail.trim().toLowerCase()
      );
      if (!nameMatches && !emailMatches) return false;

      const recMeeting = (r.meetingNumber || '').trim().toLowerCase();
      if (!curMeeting || !recMeeting) return true;
      return recMeeting === curMeeting;
    });
  };

  const handleProceedToTimer = () => {
    if (!speakerName.trim()) {
      showToast('Please choose a member (Speaker) first.');
      return;
    }
    if (!meetingNumber.trim()) {
      showToast('Please enter the Meeting Number.');
      return;
    }
    const existing = getStoredRecordForMember({ name: speakerName, gmail: speakerEmail });
    if (existing) {
      showToast(`Timing for "${speakerName}" is already stored (${existing.formattedTime}). Please choose another member.`);
      return;
    }
    setStep('timer');
  };

  const handleSubmitTiming = async () => {
    if (!speakerName.trim()) {
      showToast('Speaker name missing.');
      return;
    }
    if (secondsElapsed === 0) {
      showToast('Timer is at 00:00. Please start the timer to record speech duration.');
      return;
    }

    setIsSubmitting(true);
    const formatted = formatTimerDigits(secondsElapsed);
    const today = new Date().toISOString().split('T')[0];

    const matchedMember = members.find(
      (m) => (m.name || '').toLowerCase() === speakerName.toLowerCase() || (speakerEmail && m.gmail === speakerEmail)
    );
    const deptToSave =
      speakerDepartment.trim() ||
      (matchedMember ? [matchedMember.department, matchedMember.year ? `(${matchedMember.year})` : ''].filter(Boolean).join(' ') : '') ||
      matchedMember?.department ||
      '';

    const recordPayload: TimeStewardRecord = {
      speakerName: speakerName.trim(),
      speakerEmail: speakerEmail.trim(),
      speakerRole: speakerRole.trim() || 'Speaker',
      speakerDepartment: deptToSave,
      speechTitle: speechTitle.trim() || `${speakerRole || 'Speaker'} Presentation`,
      meetingNumber: meetingNumber.trim() || '1st Meeting',
      durationSeconds: secondsElapsed,
      formattedTime: formatted,
      status: timingStatus,
      timeStewardName: userProfile.name || 'Time Steward',
      timeStewardEmail: userProfile.gmail || '',
      date: today,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    const res = await saveTimeStewardRecord(recordPayload);
    setIsSubmitting(false);

    if (res.success) {
      setSubmittedSuccessRecord({ ...recordPayload, id: res.id });
      // Notify speaker via in-app message
      if (speakerEmail.trim()) {
        const complianceText = secondsElapsed < 180
          ? 'Advice: you must improve the speech timing in greater 3 min'
          : 'Advice: keep it up';
        sendAppMessage({
          type: 'general',
          title: `Timing Recorded • ${recordPayload.meetingNumber}`,
          message: `Your Time Steward recorded your speech duration as ${formatted} (${recordPayload.speakerRole || 'Speaker'}) for ${recordPayload.meetingNumber}. ${complianceText}. Stored inside your meeting folder!`,
          targetEmail: speakerEmail.trim().toLowerCase(),
          createdAt: new Date().toISOString(),
          createdBy: {
            name: userProfile.name || 'Time Steward',
            gmail: userProfile.gmail || '',
          },
        });
      }
      showToast(`Timing (${formatted}) saved for ${speakerName} in folder "${recordPayload.meetingNumber}"!`);
    } else {
      showToast('Failed to save timing record.');
    }
  };

  const handleResetForNextSpeaker = () => {
    setSubmittedSuccessRecord(null);
    setSpeakerName('');
    setSpeakerEmail('');
    setSpeakerDepartment('');
    setSpeakerRole('');
    setSpeechTitle('');
    setNotes('');
    setSecondsElapsed(0);
    setIsRunning(false);
    setStep('form');
  };

  const handleSelectMember = (m: RegisteredMember, roleName?: string) => {
    const existing = getStoredRecordForMember(m);
    if (existing) {
      showToast(`Timing for "${m.name}" is already stored (${existing.formattedTime}). You cannot choose this member.`);
      return;
    }
    const roles = getMemberRoles(m);
    const chosenRole = roleName || roles[0] || 'Speaker';
    const deptDisplay = [m.department, m.year ? `(${m.year})` : ''].filter(Boolean).join(' ') || m.department || '';
    setSpeakerName(m.name);
    setSpeakerEmail(m.gmail || '');
    setSpeakerDepartment(deptDisplay);
    setSpeakerRole(chosenRole);
    if (!speechTitle) {
      setSpeechTitle(`${chosenRole} Speech`);
    }
    setShowSpeakerDropdown(false);
    showToast(`Selected ${m.name} (${chosenRole})`);
  };

  // Generate full spoken script for presentation
  const generateSpokenScript = (list: TimeStewardRecord[], meetingTitle: string): string => {
    if (list.length === 0) {
      return `Respected President, General Evaluator, and fellow Declamates. Good day to all! As your Time Steward, there are currently no speaker timings recorded for ${meetingTitle}.`;
    }

    const sentences: string[] = [
      `Respected President, General Evaluator, and dear fellow Declamates. Good day to all! As your Time Steward, here is the official timing report for ${meetingTitle}:`,
    ];

    list.forEach((rec, idx) => {
      const spoken = formatSecondsToSpokenWords(rec.durationSeconds);
      const roleStr = rec.speakerRole ? `as ${rec.speakerRole}` : '';
      const qualification =
        rec.durationSeconds >= 180
          ? 'which meets the qualification timing.'
          : 'which is under the 3-minute threshold.';
      sentences.push(
        `Speaker ${idx + 1}, ${rec.speakerName} ${roleStr}, spoke for ${spoken}, ${qualification}`
      );
    });

    const qualifiedCount = list.filter((r) => r.durationSeconds >= 180).length;
    sentences.push(
      `Out of ${list.length} speaker${list.length > 1 ? 's' : ''}, ${qualifiedCount} qualified for voting. Thank you, and back to you General Evaluator!`
    );

    return sentences.join('\n\n');
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-[#06111F] border border-[#BFA373] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-[#BFA373] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Speech Report Button */}
      <div className="flex items-center justify-start">
        <button
          type="button"
          onClick={() => setShowReportModal(true)}
          className="px-5 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-cinzel font-bold text-sm flex items-center gap-2.5 transition-all cursor-pointer shadow-lg shadow-amber-500/10 hover:scale-[1.02] active:scale-95"
        >
          <Mic className="w-4 h-4 text-amber-400" />
          <span>Speech Report</span>
          {records.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black">
              {records.length}
            </span>
          )}
        </button>
      </div>

      {/* ===================================================================== */}
      {/* STEP 1: FORM (Choose Member + Meeting Number)                         */}
      {/* ===================================================================== */}
      {step === 'form' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-[#06111F] border border-[#BFA373]/30 shadow-2xl space-y-6">
          <div className="space-y-5">
            {/* Choose the Member Field */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#BFA373] font-cinzel uppercase tracking-wider">
                Choose The Member:
              </label>

              <div className="relative">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={speakerName}
                      onChange={(e) => {
                        setSpeakerName(e.target.value);
                        setShowSpeakerDropdown(true);
                      }}
                      onFocus={() => setShowSpeakerDropdown(true)}
                      placeholder={
                        appointedSpeakers.length === 0
                          ? 'No members appointed yet by Admin in Speaker Roles...'
                          : 'Click to choose an appointed member...'
                      }
                      className="w-full pl-3 pr-10 py-3 bg-[#06111F] border border-[#BFA373]/30 rounded-xl focus:border-[#BFA373] focus:ring-1 focus:ring-[#BFA373] focus:outline-none text-white font-semibold placeholder:text-slate-500 transition-colors cursor-pointer text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSpeakerDropdown(!showSpeakerDropdown)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Toggle Speakers List"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          showSpeakerDropdown ? 'rotate-180 text-amber-400' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {speakerRole && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold shrink-0">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      <span>{speakerRole}</span>
                    </span>
                  )}
                </div>

                {/* Warning if currently entered speaker is already stored */}
                {speakerName && getStoredRecordForMember({ name: speakerName, gmail: speakerEmail }) && (
                  <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>{speakerName}</strong>: All ready stored ({getStoredRecordForMember({ name: speakerName, gmail: speakerEmail })?.formattedTime}). Please choose another member.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSpeakerName('');
                        setSpeakerEmail('');
                        setSpeakerDepartment('');
                        setShowSpeakerDropdown(true);
                      }}
                      className="text-amber-300 hover:text-white underline font-bold cursor-pointer shrink-0 ml-2"
                    >
                      Choose Another
                    </button>
                  </div>
                )}

                {/* Speaker Scroll-Down Dropdown - Appointed Roles with Dropdown Arrows */}
                {showSpeakerDropdown && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1.5 bg-[#06111F] border border-[#BFA373]/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1">
                    {/* Dropdown Header */}
                    <div className="p-3 bg-[#06111F] border-b border-[#BFA373]/30 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[#BFA373] text-xs font-bold uppercase tracking-wider font-cinzel">
                        <Mic className="w-3.5 h-3.5 text-amber-400" />
                        <span>Appointed Members</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSpeakerDropdown(false)}
                        className="text-slate-400 hover:text-white cursor-pointer p-0.5"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Dropdown List Body: Grouped by Role with Dropdown Arrow */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-[#BFA373]/30/60">
                      {appointedSpeakers.length === 0 ? (
                        <div className="p-5 text-center space-y-2">
                          <p className="text-xs text-amber-300 font-semibold">
                            No members currently appointed in Speaker Roles by Admin.
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Please appoint speakers under the Speaker Roles tab first.
                          </p>
                        </div>
                      ) : rolesWithMembers.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          No appointed member matches &ldquo;{speakerName}&rdquo;
                        </div>
                      ) : (
                        rolesWithMembers.map((item) => {
                          const expanded = isRoleExpanded(item.role);

                          return (
                            <div key={item.role} className="bg-[#06111F]/40">
                              {/* Role Tag Header with Dropdown Arrow */}
                              <button
                                type="button"
                                onClick={() => toggleRole(item.role)}
                                className="w-full px-3.5 py-2.5 bg-[#06111F] hover:bg-[#06111F] flex items-center justify-between transition-colors border-b border-[#BFA373]/30/60 cursor-pointer text-left"
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 tracking-wider">
                                    {item.role}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-semibold">
                                    ({item.members.length} {item.members.length === 1 ? 'member' : 'members'})
                                  </span>
                                </div>
                                <ChevronDown
                                  className={`w-4 h-4 text-amber-400 transition-transform duration-200 ${
                                    expanded ? 'rotate-180' : ''
                                  }`}
                                />
                              </button>

                              {/* Members under this role */}
                              {expanded && (
                                <div className="divide-y divide-[#BFA373]/30/30 bg-[#06111F]">
                                  {item.members.map((m) => {
                                    const existingRecord = getStoredRecordForMember(m);
                                    const isAlreadyStored = Boolean(existingRecord);
                                    const isSelected =
                                      speakerName.toLowerCase() === (m.name || '').toLowerCase() &&
                                      speakerRole.toLowerCase() === item.role.toLowerCase();
                                    const deptDisplay =
                                      [m.department, m.year ? `(${m.year})` : ''].filter(Boolean).join(' ') ||
                                      m.department ||
                                      '';

                                    return (
                                      <button
                                        key={`${item.role}-${m.id || m.name}`}
                                        type="button"
                                        disabled={isAlreadyStored}
                                        onClick={() => {
                                          if (isAlreadyStored) return;
                                          handleSelectMember(m, item.role);
                                        }}
                                        className={`w-full text-left px-4 py-3 text-xs flex items-center justify-between transition-colors ${
                                          isAlreadyStored
                                            ? 'opacity-60 cursor-not-allowed bg-[#06111F] border-l-2 border-emerald-500/50 hover:bg-[#06111F]'
                                            : isSelected
                                            ? 'bg-amber-950/40 text-amber-300 cursor-pointer'
                                            : 'hover:bg-[#06111F] text-white cursor-pointer'
                                        }`}
                                        title={
                                          isAlreadyStored
                                            ? `All ready stored for ${m.name} (${existingRecord?.formattedTime})`
                                            : `Select ${m.name}`
                                        }
                                      >
                                        <div className="space-y-0.5">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span
                                              className={`font-bold text-sm ${
                                                isAlreadyStored ? 'text-slate-400 line-through' : 'text-white'
                                              }`}
                                            >
                                              {m.name}
                                            </span>
                                            {isAlreadyStored && (
                                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 tracking-wider">
                                                All ready stored
                                              </span>
                                            )}
                                          </div>
                                          {deptDisplay ? (
                                            <div className="text-xs text-[#BFA373] font-medium">
                                              {deptDisplay}
                                            </div>
                                          ) : null}
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 ml-3">
                                          {isAlreadyStored ? (
                                            <div className="text-right">
                                              <span className="text-xs font-black text-emerald-400 font-mono block">
                                                {existingRecord?.formattedTime}
                                              </span>
                                              <span className="text-[9px] text-slate-500 font-bold uppercase">
                                                Stored
                                              </span>
                                            </div>
                                          ) : isSelected ? (
                                            <CheckCircle2 className="w-4 h-4 text-amber-400" />
                                          ) : (
                                            <span className="text-xs text-amber-400 font-cinzel font-bold">
                                              Select
                                            </span>
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Appointed Speaker Role */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#BFA373] font-cinzel uppercase tracking-wider">
                Speaker&apos;s Appointed Role:
              </label>
              <input
                type="text"
                value={speakerRole}
                onChange={(e) => setSpeakerRole(e.target.value)}
                placeholder="e.g. Key Note Speaker, Topic Master, Evaluator..."
                className="w-full px-3.5 py-3 bg-[#06111F] border border-[#BFA373]/30 rounded-xl focus:border-[#BFA373] focus:ring-1 focus:ring-[#BFA373] focus:outline-none text-white font-semibold placeholder:text-slate-500 transition-colors text-sm"
              />
            </div>

            {/* Meeting Number Field */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#BFA373] font-cinzel uppercase tracking-wider">
                Meeting Number:
              </label>
              <input
                type="text"
                value={meetingNumber}
                onChange={(e) => setMeetingNumber(e.target.value)}
                placeholder="e.g. 1st Meeting"
                className="w-full px-3.5 py-3 bg-[#06111F] border border-[#BFA373]/30 rounded-xl focus:border-[#BFA373] focus:ring-1 focus:ring-[#BFA373] focus:outline-none text-white font-semibold placeholder:text-slate-500 transition-colors text-sm"
              />
            </div>
          </div>

          {/* Next Button */}
          <div className="pt-4 border-t border-[#BFA373]/30 flex items-center justify-between gap-3">
            {speakerName && getStoredRecordForMember({ name: speakerName, gmail: speakerEmail }) ? (
              <span className="text-xs text-rose-400 font-semibold">
                * Selected speaker is all ready stored. Please choose another member.
              </span>
            ) : (
              <span />
            )}
            <button
              type="button"
              disabled={Boolean(speakerName && getStoredRecordForMember({ name: speakerName, gmail: speakerEmail }))}
              onClick={handleProceedToTimer}
              className={`px-6 py-3 rounded-xl font-cinzel font-bold text-sm flex items-center gap-2 transition-all ${
                speakerName && getStoredRecordForMember({ name: speakerName, gmail: speakerEmail })
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-[#BFA373] hover:bg-[#BFA373] text-[#06111F] shadow-lg shadow-[#BFA373]/20 cursor-pointer hover:translate-x-0.5 active:scale-95'
              }`}
            >
              <span>Next to Timer</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 2: TIMER SCREEN (Start, Pause, Restart, Submit, Speak Timing)    */}
      {/* ===================================================================== */}
      {step === 'timer' && (
        <div className="space-y-6">
          {/* Active Session Info Bar with Back Button */}
          <div className="p-4 rounded-2xl bg-[#06111F] border border-[#BFA373]/30 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  if (isRunning) {
                    const confirmLeave = window.confirm('The timer is currently running. Are you sure you want to go back to edit speaker details?');
                    if (!confirmLeave) return;
                    setIsRunning(false);
                  }
                  setStep('form');
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-[#BFA373]/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#BFA373]" />
                <span>Back</span>
              </button>

              <div className="text-xs flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-400">Timing Speaker: </span>
                <strong className="text-white text-sm">{speakerName}</strong>
                {speakerRole && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                    {speakerRole}
                  </span>
                )}
                <span className="text-slate-500 mx-1">&bull;</span>
                <span className="text-amber-400 font-cinzel font-bold">{meetingNumber}</span>
              </div>
            </div>
          </div>

          {/* Large Stopwatch Display Card */}
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[#06111F] to-[#06111F] border border-[#BFA373]/30 shadow-2xl text-center space-y-6 relative overflow-hidden">
            {/* Background Glow based on timing status */}
            <div
              className={`absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
                timingStatus === 'green'
                  ? 'bg-emerald-500/15'
                  : timingStatus === 'amber'
                  ? 'bg-amber-500/15'
                  : timingStatus === 'red'
                  ? 'bg-rose-500/20'
                  : 'bg-[#BFA373]/10'
              }`}
            />

            {/* Status Pill */}
            <div className="relative z-10 flex items-center justify-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5 ${
                  timingStatus === 'green'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : timingStatus === 'amber'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : timingStatus === 'red'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    : 'bg-[#06111F] text-slate-300 border-[#BFA373]/30'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {timingStatus === 'green'
                    ? 'Green Signal (5:00 Met)'
                    : timingStatus === 'amber'
                    ? 'Amber Signal (6:00 Warning)'
                    : timingStatus === 'red'
                    ? 'Red Signal (7:00 Maximum Reached)'
                    : 'Speech Timing In Progress'}
                </span>
              </span>
            </div>

            {/* Numbers Display (MM:SS) */}
            <div className="relative z-10">
              <div className="font-mono text-6xl sm:text-8xl lg:text-9xl font-black text-white tracking-widest drop-shadow-[0_0_25px_rgba(197,168,128,0.2)]">
                {formatTimerDigits(secondsElapsed)}
              </div>
              <p className="text-xs text-slate-400 mt-2 font-mono">
                MINUTES : SECONDS
              </p>
            </div>

            {/* Timer Action Controls: Start, Pause, Restart */}
            <div className="relative z-10 flex flex-wrap items-center justify-center gap-4 pt-2">
              {/* Start Button */}
              {!isRunning ? (
                <button
                  type="button"
                  onClick={handleStart}
                  className="px-7 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-cinzel font-bold text-base flex items-center gap-2.5 shadow-xl shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>Start</span>
                </button>
              ) : (
                /* Pause Button */
                <button
                  type="button"
                  onClick={handlePause}
                  className="px-7 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-cinzel font-bold text-base flex items-center gap-2.5 shadow-xl shadow-amber-600/30 transition-all cursor-pointer active:scale-95"
                >
                  <Pause className="w-5 h-5 fill-white" />
                  <span>Pause</span>
                </button>
              )}

              {/* Restart Button */}
              <button
                type="button"
                onClick={handleRestart}
                className="px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-[#BFA373]/30 font-cinzel font-bold text-sm flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-4 h-4 text-slate-400" />
                <span>Restart</span>
              </button>
            </div>

            {/* Optional Remarks / Notes */}
            <div className="relative z-10 max-w-lg mx-auto pt-4 text-left space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Remarks / Timing Note (Optional):
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Delivered fully on time / Qualified"
                className="w-full px-3.5 py-2.5 bg-[#06111F] border border-[#BFA373]/30 rounded-xl focus:border-[#BFA373] focus:ring-1 focus:ring-[#BFA373] focus:outline-none text-white text-xs placeholder:text-slate-500 transition-colors"
              />
            </div>

            {/* Submit Button */}
            <div className="relative z-10 pt-4 max-w-lg mx-auto flex items-center justify-center">
              <button
                type="button"
                onClick={handleSubmitTiming}
                disabled={isSubmitting}
                className="w-full px-8 py-3.5 rounded-2xl bg-[#BFA373] hover:bg-[#BFA373] text-[#06111F] font-cinzel font-bold text-base flex items-center justify-center gap-2 shadow-xl shadow-[#BFA373]/25 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBMITTED CONFIRMATION MODAL                                          */}
      {/* ===================================================================== */}
      {submittedSuccessRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#06111F] border border-[#BFA373] rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-cinzel text-xl font-bold text-white">
                Timing Recorded Successfully!
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm">
                The speech duration has been stored in the speaker&apos;s meeting folder.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#06111F] border border-[#BFA373]/30 text-xs space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-slate-400">Speaker:</span>
                <strong className="text-white">{submittedSuccessRecord.speakerName}</strong>
              </div>
              {submittedSuccessRecord.speakerRole && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Speaker Role:</span>
                  <strong className="text-amber-300">{submittedSuccessRecord.speakerRole}</strong>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Meeting Folder:</span>
                <strong className="text-amber-300 font-cinzel">{submittedSuccessRecord.meetingNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recorded Time:</span>
                <strong className="text-emerald-400 font-mono text-sm">{submittedSuccessRecord.formattedTime}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Time Steward:</span>
                <strong className="text-slate-200">{submittedSuccessRecord.timeStewardName}</strong>
              </div>
            </div>

            {/* Keynote Speech Timing Compliance Box (Compulsory 3-Minute Rule) */}
            {submittedSuccessRecord.durationSeconds < 180 ? (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/50 flex items-center justify-between gap-3 text-xs text-red-300 text-left animate-in fade-in shadow-lg shadow-red-950/30">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  <div>
                    <span className="font-bold block text-red-200 text-sm">
                      you must improve the speech timing in greater 3 min
                    </span>
                    <span className="text-[11px] text-red-300/80">
                      Speech duration was under the compulsory 3-minute threshold (180s).
                    </span>
                  </div>
                </div>
                <span className="font-cinzel font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 shrink-0 hidden sm:inline-block">
                  Under 3 Min
                </span>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-950/25 border border-emerald-500/40 flex items-center justify-between gap-3 text-xs text-emerald-300 text-left animate-in fade-in shadow-lg shadow-emerald-950/20">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold block text-emerald-200 text-sm">
                      keep it up
                    </span>
                    <span className="text-[11px] text-emerald-300/80">
                      Minimum 3 minutes compulsory speech requirement achieved!
                    </span>
                  </div>
                </div>
                <span className="font-cinzel font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0 hidden sm:inline-block">
                  Qualified
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetForNextSpeaker}
                className="flex-1 px-4 py-3 rounded-xl bg-[#BFA373] hover:bg-[#BFA373] text-[#06111F] font-cinzel font-bold text-xs shadow-lg transition-colors cursor-pointer"
              >
                Time Another Speaker
              </button>
              <button
                type="button"
                onClick={() => setSubmittedSuccessRecord(null)}
                className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-[#BFA373]/30 text-xs font-semibold transition-colors cursor-pointer"
              >
                Stay on Timer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* HISTORY MODAL (All Recorded Timings)                                  */}
      {/* ===================================================================== */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#06111F] border border-[#BFA373]/30 rounded-3xl p-6 space-y-5 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#BFA373]/30 pb-4">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-orange-400" />
                <h3 className="font-cinzel text-lg font-bold text-white">
                  Recorded Timings History
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowHistoryModal(false);
                    setShowReportModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5 text-amber-400" />
                  <span>Speech Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {records.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No timings recorded yet.
                </div>
              ) : (
                records.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-4 rounded-2xl bg-[#06111F] border border-[#BFA373]/30 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{rec.speakerName}</span>
                        {rec.speakerRole && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {rec.speakerRole}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-[#BFA373]/30 text-slate-300 font-cinzel font-bold text-[10px]">
                          {rec.meetingNumber}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Spoken: &ldquo;{formatSecondsToSpokenWords(rec.durationSeconds)}&rdquo; &bull; {rec.date}
                      </p>
                      {rec.notes && (
                        <p className="text-slate-400 text-[11px] italic">
                          Note: {rec.notes}
                        </p>
                      )}
                      <div className="pt-0.5">
                        {rec.durationSeconds < 180 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>you must improve the speech timing in greater 3 min</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>keep it up</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <span className="font-mono text-base font-black text-emerald-400 block">
                          {rec.formattedTime}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          by {rec.timeStewardName}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteClick(rec)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SPEECH REPORT MODAL (Full Screen, Role Grouping, Name & Department)  */}
      {/* ===================================================================== */}
      {showReportModal && (() => {
        // Distinct meeting numbers
        const distinctMeetings = Array.from(new Set(records.map((r) => r.meetingNumber).filter(Boolean)));
        const filteredRecordsForReport = reportMeetingFilter === 'all'
          ? records
          : records.filter((r) => r.meetingNumber === reportMeetingFilter);

        // Group records by role, placing the most recently timed/recorded role at the TOP heading!
        const roleGroups: { role: string; records: TimeStewardRecord[] }[] = [];
        const seenRoles = new Set<string>();

        filteredRecordsForReport.forEach((rec) => {
          const rName = (rec.speakerRole || 'Key Note Speaker').trim();
          const key = rName.toLowerCase();
          if (!seenRoles.has(key)) {
            seenRoles.add(key);
            roleGroups.push({
              role: rName,
              records: filteredRecordsForReport.filter(
                (r) => (r.speakerRole || 'Key Note Speaker').trim().toLowerCase() === key
              ),
            });
          }
        });

        return (
          <div className="fixed inset-0 z-50 bg-[#06111F] flex flex-col w-screen h-screen overflow-hidden animate-in fade-in duration-200">
            {/* Top Navigation Bar */}
            <div className="px-4 sm:px-8 py-3.5 sm:py-4 bg-[#06111F] border-b border-[#BFA373]/30 flex items-center justify-between gap-4 shrink-0 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shadow-lg shrink-0">
                  <Mic className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-cinzel text-lg sm:text-2xl font-bold text-white flex items-center gap-2.5">
                    <span>Speech Report</span>
                    {filteredRecordsForReport.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-sans font-black">
                        {filteredRecordsForReport.length}
                      </span>
                    )}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2.5 sm:gap-3">
                {distinctMeetings.length > 1 && (
                  <select
                    value={reportMeetingFilter}
                    onChange={(e) => setReportMeetingFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#06111F] border border-[#BFA373]/30 text-xs font-semibold text-amber-300 focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Meetings ({records.length})</option>
                    {distinctMeetings.map((m) => (
                      <option key={m} value={m}>
                        {m} ({records.filter((r) => r.meetingNumber === m).length})
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowReportModal(false);
                  }}
                  className="px-3.5 sm:px-4 py-2 rounded-xl bg-[#06111F] hover:bg-[#06111F] text-slate-300 hover:text-white border border-[#BFA373]/30 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Close</span>
                </button>
              </div>
            </div>

            {/* Full-Screen Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 max-w-5xl mx-auto w-full">
              {roleGroups.length === 0 ? (
                <div className="py-24 text-center space-y-3">
                  <Clock className="w-12 h-12 text-slate-600 mx-auto" />
                  <p className="text-base text-slate-300 font-semibold font-cinzel">
                    No speeches recorded yet.
                  </p>
                  <p className="text-xs text-slate-500">
                    Time a speaker using the stopwatch to record their timing report here!
                  </p>
                </div>
              ) : (
                roleGroups.map((group, groupIdx) => {
                  return (
                    <div key={group.role || groupIdx} className="space-y-3.5">
                      {/* Role Top Heading */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-[#BFA373]/30">
                        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                          <span className="px-3.5 py-1 rounded-full text-xs sm:text-sm font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 tracking-wider font-cinzel">
                            {group.role}
                          </span>
                          {groupIdx === 0 && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 font-semibold">
                          {group.records.length} {group.records.length === 1 ? 'Speaker' : 'Speakers'}
                        </span>
                      </div>

                      {/* Speakers in this Role */}
                      <div className="grid grid-cols-1 gap-3">
                        {group.records.map((rec, recIdx) => {
                          const spokenWords = formatSecondsToSpokenWords(rec.durationSeconds);
                          const isQualified = rec.durationSeconds >= 180;

                          // Retrieve department from record or fallback from registered members list
                          const matched = members.find(
                            (m) =>
                              (m.name || '').toLowerCase() === (rec.speakerName || '').toLowerCase() ||
                              (rec.speakerEmail && m.gmail === rec.speakerEmail)
                          );
                          const deptStr =
                            rec.speakerDepartment ||
                            [matched?.department, matched?.year ? `(${matched.year})` : ''].filter(Boolean).join(' ') ||
                            matched?.department ||
                            '';

                          return (
                            <div
                              key={rec.id || recIdx}
                              className="p-4 sm:p-5 rounded-2xl bg-[#06111F] border border-[#BFA373]/30 hover:border-amber-500/40 transition-colors flex items-center justify-between gap-4 shadow-xl"
                            >
                              {/* Left: Speaker Name + Department (underneath) + Meeting Info */}
                              <div className="space-y-1">
                                <h4 className="font-bold text-white text-base sm:text-lg">
                                  {rec.speakerName}
                                </h4>
                                {deptStr ? (
                                  <p className="text-xs sm:text-sm text-[#BFA373] font-medium">
                                    {deptStr}
                                  </p>
                                ) : null}

                                <div className="flex items-center gap-2 pt-1 text-xs text-slate-400 flex-wrap">
                                  <span className="font-cinzel font-semibold text-amber-300/80">
                                    {rec.meetingNumber}
                                  </span>
                                  <span>&bull;</span>
                                  <span className="text-[11px] text-slate-500">{rec.date}</span>
                                  <span>&bull;</span>
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                      isQualified
                                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                        : 'bg-red-500/15 text-red-300 border border-red-500/30'
                                    }`}
                                  >
                                    {isQualified ? 'Qualified' : 'Under 3 Min'}
                                  </span>
                                </div>
                              </div>

                              {/* Right: Big Time + Delete button ONLY (Volume & Copy removed as requested) */}
                              <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                                <div className="text-right">
                                  <span className="font-mono text-2xl sm:text-3xl font-black text-amber-300 block tracking-tight">
                                    {rec.formattedTime}
                                  </span>
                                  <span className="text-[11px] text-slate-500 block">
                                    {spokenWords}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteClick(rec)}
                                  className="p-2.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
                                  title="Delete timing record"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Bar */}
            <div className="px-4 sm:px-8 py-3.5 bg-[#06111F] border-t border-[#BFA373]/30 flex items-center justify-between text-xs text-slate-400 shrink-0">
              <span>
                Showing {filteredRecordsForReport.length} recorded speech{filteredRecordsForReport.length !== 1 ? 'es' : ''} across {roleGroups.length} role{roleGroups.length !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowReportModal(false);
                }}
                className="px-5 py-2 rounded-xl bg-[#06111F] hover:bg-[#06111F] text-white border border-[#BFA373]/30 font-semibold cursor-pointer transition-colors"
              >
                Close Full Screen
              </button>
            </div>
          </div>
        );
      })()}

      {/* ===================================================================== */}
      {/* CONFIRM DELETE TIMING RECORD MODAL (In-App Dialog, iframe-safe)       */}
      {/* ===================================================================== */}
      {recordToDelete && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#06111F] border border-red-500/30 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-cinzel text-lg sm:text-xl font-bold text-white">
                  Delete Timing Record?
                </h3>
                <p className="text-xs text-slate-400">
                  This record will be permanently deleted from reports.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#06111F] border border-[#BFA373]/30 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Speaker:</span>
                <span className="font-bold text-white text-sm">{recordToDelete.speakerName}</span>
              </div>
              {recordToDelete.speakerDepartment ? (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Department:</span>
                  <span className="font-medium text-[#BFA373]">{recordToDelete.speakerDepartment}</span>
                </div>
              ) : null}
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Role:</span>
                <span className="font-medium text-amber-300">{recordToDelete.speakerRole || 'Speaker'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Meeting:</span>
                <span className="font-medium text-white">{recordToDelete.meetingNumber}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[#BFA373]/30">
                <span className="text-slate-400">Recorded Time:</span>
                <span className="font-mono font-black text-amber-400 text-base">{recordToDelete.formattedTime}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                disabled={isDeletingRecord}
                onClick={() => setRecordToDelete(null)}
                className="flex-1 px-4 py-3 rounded-xl bg-[#06111F] hover:bg-[#06111F] text-slate-300 hover:text-white border border-[#BFA373]/30 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingRecord}
                onClick={handleExecuteDelete}
                className="flex-1 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeletingRecord ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Record</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

