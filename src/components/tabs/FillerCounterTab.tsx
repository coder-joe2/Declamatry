import React, { useState, useEffect, useMemo } from 'react';
import {
  UserProfile,
  FillerCounterRecord,
  FillerCounts,
  FillerSummaryRating,
  RegisteredMember,
  formatSpeakerRole,
} from '../../types';
import { SocietyLogo } from '../SocietyLogo';
import {
  saveFillerCounterRecord,
  subscribeToFillerCounterRecords,
  deleteFillerCounterRecord,
  subscribeToRegisteredMembers,
  sendAppMessage,
} from '../../firebase';
import {
  Filter,
  Plus,
  Minus,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  X,
  User,
  Calendar,
  Clock,
  Send,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Mic,
  AlertCircle,
  Volume2,
  Sparkles,
  CheckSquare,
  Square,
  HelpCircle,
  Award,
} from 'lucide-react';

interface FillerCounterTabProps {
  userProfile: UserProfile;
}

const INITIAL_COUNTS: FillerCounts = {
  ah: 0,
  um: 0,
  er: 0,
  well: 0,
  so: 0,
  like: 0,
  but: 0,
  repeats: 0,
  other: 0,
};

interface FillerItemDef {
  key: keyof FillerCounts;
  short: string;
  label: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

const FILLER_CATEGORIES: FillerItemDef[] = [
  {
    key: 'ah',
    short: 'AH',
    label: 'Ah',
    color: 'amber',
    badgeBg: 'bg-amber-500/15',
    badgeBorder: 'border-amber-500/30',
    badgeText: 'text-amber-300',
  },
  {
    key: 'um',
    short: 'UM',
    label: 'Um / Uhh',
    color: 'orange',
    badgeBg: 'bg-orange-500/15',
    badgeBorder: 'border-orange-500/30',
    badgeText: 'text-orange-300',
  },
  {
    key: 'er',
    short: 'ER',
    label: 'Er',
    color: 'rose',
    badgeBg: 'bg-rose-500/15',
    badgeBorder: 'border-rose-500/30',
    badgeText: 'text-rose-300',
  },
  {
    key: 'well',
    short: 'WELL',
    label: 'Well',
    color: 'teal',
    badgeBg: 'bg-teal-500/15',
    badgeBorder: 'border-teal-500/30',
    badgeText: 'text-teal-300',
  },
  {
    key: 'so',
    short: 'SO',
    label: 'So',
    color: 'sky',
    badgeBg: 'bg-sky-500/15',
    badgeBorder: 'border-sky-500/30',
    badgeText: 'text-sky-300',
  },
  {
    key: 'like',
    short: 'LIKE',
    label: 'Like',
    color: 'purple',
    badgeBg: 'bg-purple-500/15',
    badgeBorder: 'border-purple-500/30',
    badgeText: 'text-purple-300',
  },
  {
    key: 'but',
    short: 'BUT',
    label: 'But',
    color: 'indigo',
    badgeBg: 'bg-indigo-500/15',
    badgeBorder: 'border-indigo-500/30',
    badgeText: 'text-indigo-300',
  },
];

export const FillerCounterTab: React.FC<FillerCounterTabProps> = ({ userProfile }) => {
  // Step 1: form, Step 2: counter
  const [step, setStep] = useState<'form' | 'counter'>('form');

  // Form Fields
  const [members, setMembers] = useState<RegisteredMember[]>([]);
  const [speakerName, setSpeakerName] = useState<string>('');
  const [speakerEmail, setSpeakerEmail] = useState<string>('');
  const [speakerRole, setSpeakerRole] = useState<string>('');
  const [speakerDepartment, setSpeakerDepartment] = useState<string>('');
  const [speechTitle, setSpeechTitle] = useState<string>('Keynote Speech Presentation');
  const [meetingNumber, setMeetingNumber] = useState<string>('1st Meeting');
  const [meetingDate, setMeetingDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [meetingTime, setMeetingTime] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  // Dropdown UI & Role Expand State
  const [showSpeakerDropdown, setShowSpeakerDropdown] = useState<boolean>(false);
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});

  const toggleRole = (role: string) => {
    setExpandedRoles((prev) => ({
      ...prev,
      [role]: prev[role] === undefined ? false : !prev[role],
    }));
  };

  const isRoleExpanded = (role: string) => {
    return expandedRoles[role] ?? true;
  };

  // Counter State (Step 2)
  const [counts, setCounts] = useState<FillerCounts>({ ...INITIAL_COUNTS });
  const [otherDetails, setOtherDetails] = useState<string>('');
  const [summaryRating, setSummaryRating] = useState<FillerSummaryRating>('Excellent');
  const [notes, setNotes] = useState<string>('');
  const [hasManuallySetRating, setHasManuallySetRating] = useState<boolean>(false);

  // Records & Report Modal
  const [records, setRecords] = useState<FillerCounterRecord[]>([]);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportMeetingFilter, setReportMeetingFilter] = useState<string>('all');
  const [recordToDelete, setRecordToDelete] = useState<FillerCounterRecord | null>(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [submittedSuccessRecord, setSubmittedSuccessRecord] = useState<FillerCounterRecord | null>(null);

  // Load members for Speaker selection
  useEffect(() => {
    const unsub = subscribeToRegisteredMembers((data) => {
      setMembers(data);
    });
    return () => unsub();
  }, []);

  // Subscribe to all filler counter records
  useEffect(() => {
    const unsub = subscribeToFillerCounterRecords((data) => {
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

  const handleDeleteClick = (rec: FillerCounterRecord) => {
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
          r.totalFillers === target.totalFillers &&
          r.meetingNumber === target.meetingNumber
        ) {
          return false;
        }
        return true;
      })
    );

    try {
      await deleteFillerCounterRecord(target);
      showToast(`Filler record for "${target.speakerName}" deleted.`);
    } catch (err) {
      console.error('Delete error:', err);
      showToast('Failed to delete filler record.');
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

  // Helper to check if filler count for a member is already stored for this meeting
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
      return curMeeting === recMeeting;
    });
  };

  const handleSelectMember = (m: RegisteredMember, roleName?: string) => {
    const existing = getStoredRecordForMember(m);
    if (existing) {
      showToast(`Filler record for "${m.name}" is already stored (${existing.totalFillers} fillers). You cannot choose this member.`);
      return;
    }
    const roles = getMemberRoles(m);
    const chosenRole = roleName || roles[0] || 'Speaker';
    const deptDisplay = [m.department, m.year ? `(${m.year})` : ''].filter(Boolean).join(' ') || m.department || '';
    setSpeakerName(m.name);
    setSpeakerEmail(m.gmail || '');
    setSpeakerDepartment(deptDisplay);
    setSpeakerRole(chosenRole);
    if (!speechTitle || speechTitle === 'Keynote Speech Presentation') {
      setSpeechTitle(`${chosenRole} Presentation`);
    }
    setShowSpeakerDropdown(false);
    showToast(`Selected ${m.name} (${chosenRole})`);
  };

  // Total count calculation
  const totalFillers = useMemo(() => {
    return (
      counts.ah +
      counts.um +
      counts.er +
      counts.well +
      counts.so +
      counts.like +
      counts.but +
      counts.repeats +
      counts.other
    );
  }, [counts]);

  // Unique meetings for filter
  const meetingList = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.meetingNumber) set.add(r.meetingNumber);
    });
    return Array.from(set);
  }, [records]);

  const filteredReportRecords = useMemo(() => {
    if (reportMeetingFilter === 'all') return records;
    return records.filter((r) => r.meetingNumber === reportMeetingFilter);
  }, [records, reportMeetingFilter]);

  // Grouped by appointed role for the Speech Report Modal
  const reportGroupedByRole = useMemo(() => {
    const map = new Map<string, FillerCounterRecord[]>();
    filteredReportRecords.forEach((rec) => {
      const role = rec.speakerRole || 'Speaker';
      if (!map.has(role)) {
        map.set(role, []);
      }
      map.get(role)!.push(rec);
    });
    return Array.from(map.entries());
  }, [filteredReportRecords]);

  // Auto-adjust rating suggestion if not manually overridden
  useEffect(() => {
    if (!hasManuallySetRating) {
      if (totalFillers <= 2) {
        setSummaryRating('Excellent');
      } else if (totalFillers <= 6) {
        setSummaryRating('Okay');
      } else {
        setSummaryRating('Needs Improvement');
      }
    }
  }, [totalFillers, hasManuallySetRating]);

  // Increment with optional subtle vibration feedback
  const handleIncrement = (key: keyof FillerCounts) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate?.(20);
      } catch {
        // ignore
      }
    }
    setCounts((prev) => ({
      ...prev,
      [key]: prev[key] + 1,
    }));
  };

  const handleDecrement = (key: keyof FillerCounts) => {
    setCounts((prev) => ({
      ...prev,
      [key]: Math.max(0, prev[key] - 1),
    }));
  };

  const handleResetCounter = () => {
    if (totalFillers === 0) return;
    if (window.confirm('Reset all filler counts to zero?')) {
      setCounts({ ...INITIAL_COUNTS });
      setOtherDetails('');
      setHasManuallySetRating(false);
      showToast('All counters reset to 0');
    }
  };

  // Proceed to counter
  const handleProceedToCounter = () => {
    if (!speakerName.trim()) {
      showToast('Please choose or enter the speaker name first.');
      return;
    }
    setStep('counter');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit Handler
  const handleSubmitReport = async () => {
    if (!speakerName.trim()) {
      showToast('Please specify a speaker name.');
      return;
    }

    setIsSubmitting(true);
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const recordPayload: FillerCounterRecord = {
      speakerName: speakerName.trim(),
      speakerEmail: speakerEmail.trim(),
      speakerRole: speakerRole.trim() || 'Speaker',
      speakerDepartment: speakerDepartment.trim(),
      meetingNumber: meetingNumber.trim() || '1st Meeting',
      date: today,
      time: time,
      roleOrTitle: speechTitle.trim() || (speakerRole ? `${speakerRole} Presentation` : 'Speaker Presentation'),
      counts: { ...counts },
      totalFillers,
      otherDetails: otherDetails.trim(),
      summaryRating,
      notes: notes.trim(),
      fillerCounterName: userProfile.name || 'Filler Counter',
      fillerCounterEmail: userProfile.gmail || '',
      createdAt: new Date().toISOString(),
    };

    const res = await saveFillerCounterRecord(recordPayload);
    setIsSubmitting(false);

    if (res.success) {
      setSubmittedSuccessRecord({ ...recordPayload, id: res.id });
      // Notify speaker via in-app message
      if (speakerEmail.trim()) {
        const ratingMsg =
          summaryRating === 'Excellent'
            ? 'Excellent work with minimal fillers!'
            : summaryRating === 'Okay'
            ? 'Good speech with moderate filler usage.'
            : 'Frequent fillers noted; review your log to improve speech impact.';

        sendAppMessage({
          type: 'general',
          title: `Filler Counter Report • ${recordPayload.meetingNumber}`,
          message: `Your Filler Counter recorded ${totalFillers} total filler word(s) (${summaryRating}) for ${recordPayload.meetingNumber}. ${ratingMsg} Stored inside your meeting folder!`,
          targetEmail: speakerEmail.trim().toLowerCase(),
          createdAt: new Date().toISOString(),
          createdBy: {
            name: userProfile.name || 'Filler Counter',
            gmail: userProfile.gmail || '',
          },
        });
      }
      showToast(`Filler Report saved for ${speakerName} under "${recordPayload.meetingNumber}"!`);
    } else {
      showToast('Failed to save filler counter record.');
    }
  };

  const handleResetForNextSpeaker = () => {
    setSubmittedSuccessRecord(null);
    setSpeakerName('');
    setSpeakerEmail('');
    setSpeakerRole('');
    setSpeakerDepartment('');
    setSpeechTitle('Keynote Speech Presentation');
    setCounts({ ...INITIAL_COUNTS });
    setOtherDetails('');
    setNotes('');
    setHasManuallySetRating(false);
    setStep('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300 pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-[#0E1F36] border border-[#C5A880] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-[#C5A880] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Speech Report Button (Same as Time Steward) */}
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

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-[#050B14] border border-[#1E2E48] shadow-xl">
        <div className="flex items-center gap-3">
          {step === 'counter' && (
            <button
              type="button"
              onClick={() => {
                if (totalFillers > 0) {
                  const confirmLeave = window.confirm(
                    'You have recorded filler counts. Are you sure you want to go back to edit speaker details?'
                  );
                  if (!confirmLeave) return;
                }
                setStep('form');
              }}
              className="p-2 rounded-xl bg-[#081220] hover:bg-[#0E1E38] text-slate-300 hover:text-white border border-[#1E2E48] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer mr-1"
              title="Back to Speaker Details"
            >
              <ArrowLeft className="w-4 h-4 text-[#C5A880]" />
              <span>Back</span>
            </button>
          )}
          <SocietyLogo size="sm" className="border border-[#C5A880]/60 shadow-md shrink-0" />
          <h2 className="font-cinzel text-base sm:text-xl font-bold text-white tracking-wider">
            FILLER COUNTER
          </h2>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* STEP 1: SETUP FORM (Same as Time Steward: Speaker & Meeting Number)    */}
      {/* ===================================================================== */}
      {step === 'form' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-[#050B14] border border-[#1E2E48] shadow-2xl space-y-6">
          <div className="space-y-5">
            {/* Choose the Member Field (Same as Time Steward) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#C5A880] font-cinzel uppercase tracking-wider">
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
                      className="w-full pl-3 pr-10 py-3 bg-[#030712] border border-[#1E2E48] rounded-xl focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] focus:outline-none text-white font-semibold placeholder:text-slate-500 transition-colors cursor-pointer text-sm"
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
                        <strong>{speakerName}</strong>: All ready stored ({getStoredRecordForMember({ name: speakerName, gmail: speakerEmail })?.totalFillers} fillers). Please choose another member.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSpeakerName('');
                        setSpeakerEmail('');
                        setSpeakerDepartment('');
                        setSpeakerRole('');
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
                  <div className="absolute top-full left-0 right-0 z-30 mt-1.5 bg-[#081220] border border-[#1E2E48] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1">
                    {/* Dropdown Header */}
                    <div className="p-3 bg-[#050B14] border-b border-[#1E2E48] flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[#C5A880] text-xs font-bold uppercase tracking-wider font-cinzel">
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
                    <div className="max-h-80 overflow-y-auto divide-y divide-[#1E2E48]/60">
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
                            <div key={item.role} className="bg-[#050B14]/40">
                              {/* Role Tag Header with Dropdown Arrow */}
                              <button
                                type="button"
                                onClick={() => toggleRole(item.role)}
                                className="w-full px-3.5 py-2.5 bg-[#050B14] hover:bg-[#0A192F] flex items-center justify-between transition-colors border-b border-[#1E2E48]/60 cursor-pointer text-left"
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
                                <div className="divide-y divide-[#1E2E48]/30 bg-[#030712]">
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
                                            ? 'opacity-60 cursor-not-allowed bg-[#02050B] border-l-2 border-emerald-500/50 hover:bg-[#02050B]'
                                            : isSelected
                                            ? 'bg-amber-950/40 text-amber-300 cursor-pointer'
                                            : 'hover:bg-[#0E1F36] text-white cursor-pointer'
                                        }`}
                                        title={
                                          isAlreadyStored
                                            ? `All ready stored for ${m.name} (${existingRecord?.totalFillers} fillers)`
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
                                            <div className="text-xs text-[#C5A880] font-medium">
                                              {deptDisplay}
                                            </div>
                                          ) : null}
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 ml-3">
                                          {isAlreadyStored ? (
                                            <div className="text-right">
                                              <span className="text-xs font-black text-emerald-400 font-mono block">
                                                {existingRecord?.totalFillers} fillers
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

            {/* Meeting Number Field */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#C5A880] font-cinzel uppercase tracking-wider">
                Meeting Number:
              </label>
              <input
                type="text"
                value={meetingNumber}
                onChange={(e) => setMeetingNumber(e.target.value)}
                placeholder="e.g. 1st Meeting"
                className="w-full px-3.5 py-3 bg-[#030712] border border-[#1E2E48] rounded-xl focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] focus:outline-none text-white font-semibold placeholder:text-slate-500 transition-colors text-sm"
              />
            </div>
          </div>

          {/* Next Button */}
          <div className="pt-4 border-t border-[#1E2E48] flex justify-end">
            <button
              type="button"
              onClick={handleProceedToCounter}
              className="px-6 py-3 rounded-xl bg-[#C5A880] hover:bg-[#d8bd98] text-[#0A192F] font-cinzel font-bold text-sm flex items-center gap-2 shadow-lg shadow-[#C5A880]/20 transition-all cursor-pointer hover:translate-x-0.5 active:scale-95"
            >
              <span>Next to Filler Counter Log</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 2: FILLER COUNTER LOG (Interactive Mobile-Friendly Counter)      */}
      {/* ===================================================================== */}
      {step === 'counter' && (
        <div className="space-y-6">
          {/* ================================================================= */}
          {/* MOBILE-FIRST INTERACTIVE TAP COUNTERS GRID                        */}
          {/* ================================================================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-cinzel text-base sm:text-lg font-bold text-white tracking-wider flex items-center gap-2">
                  <Filter className="w-4 h-4 text-teal-400" />
                  <span>Filler Counter Log &bull; Tap to Count</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  
                </p>
              </div>
            </div>

            {/* Tap Cards Grid (Optimized for Mobile Touch) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
              {FILLER_CATEGORIES.map((item) => {
                const count = counts[item.key];
                return (
                  <div
                    key={item.key}
                    className="relative p-3.5 sm:p-4 rounded-2xl bg-[#050B14] border border-[#1E2E48] hover:border-[#C5A880]/60 flex flex-col justify-between transition-all shadow-md group"
                  >
                    {/* Header: Centered Word Label */}
                    <div className="flex items-center justify-center pb-2 border-b border-[#1E2E48]/60">
                      <span className="text-sm sm:text-base font-bold text-white tracking-wide text-center">
                        {item.label}
                      </span>
                    </div>

                    {/* Big Tap Area */}
                    <div className="py-3 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleIncrement(item.key)}
                        className="w-full py-4 sm:py-5 rounded-2xl bg-[#0B172A] hover:bg-[#112440] active:scale-95 border border-[#1E2E48] hover:border-[#C5A880] transition-all flex flex-col items-center justify-center cursor-pointer shadow-inner select-none"
                      >
                        <span
                          className={`text-3xl sm:text-4xl font-mono font-black ${
                            count > 0 ? 'text-white drop-shadow-[0_0_10px_rgba(197,168,128,0.3)]' : 'text-slate-500'
                          }`}
                        >
                          {count}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-[#C5A880] mt-1">
                          <Plus className="w-3.5 h-3.5" />
                          <span>TAP +1</span>
                        </div>
                      </button>
                    </div>

                    {/* Bottom Controls: Decrement */}
                    <div className="flex items-center justify-end pt-2 border-t border-[#1E2E48]/60 text-[10px]">
                      <button
                        type="button"
                        disabled={count === 0}
                        onClick={() => handleDecrement(item.key)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-white border border-[#1E2E48] transition-colors cursor-pointer"
                        title="Subtract 1"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Other Fillers Details Input */}
            <div className="p-4 rounded-2xl bg-[#050B14] border border-[#1E2E48] space-y-2">
              <label className="block text-xs font-bold text-[#C5A880] font-cinzel uppercase tracking-wider">
                Other Fillers (Please Specify):
              </label>
              <input
                type="text"
                value={otherDetails}
                onChange={(e) => setOtherDetails(e.target.value)}
                placeholder='e.g., "you know" x2, "basically" x1, "actually" x1'
                className="w-full px-3.5 py-2.5 bg-[#030712] border border-[#1E2E48] rounded-xl focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] focus:outline-none text-white text-xs font-semibold placeholder:text-slate-500 transition-colors"
              />
            </div>
          </div>

          {/* Submit Report Bar */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[#050B14] border border-[#1E2E48] flex items-center justify-center shadow-xl">
            <button
              type="button"
              onClick={handleSubmitReport}
              disabled={isSubmitting}
              className="w-full sm:w-auto min-w-[240px] px-8 py-3.5 rounded-2xl bg-[#C5A880] hover:bg-[#d8bd98] text-[#0A192F] font-cinzel font-bold text-base flex items-center justify-center gap-2 shadow-xl shadow-[#C5A880]/25 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Filler Report'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBMISSION CONFIRMATION MODAL                                         */}
      {/* ===================================================================== */}
      {submittedSuccessRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#050B14] border border-[#C5A880] rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-cinzel text-xl font-bold text-white">
                Filler Report Saved Successfully!
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm">
                The count has been synchronized under the keynote speaker&apos;s meeting folder.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#030712] border border-[#1E2E48] text-xs space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-slate-400">Speaker:</span>
                <strong className="text-white">{submittedSuccessRecord.speakerName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Meeting Folder:</span>
                <strong className="text-amber-300 font-cinzel">{submittedSuccessRecord.meetingNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Fillers:</span>
                <strong className="text-teal-400 font-mono text-base font-black">
                  {submittedSuccessRecord.totalFillers}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Overall Rating:</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase font-cinzel ${
                    submittedSuccessRecord.summaryRating === 'Excellent'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : submittedSuccessRecord.summaryRating === 'Okay'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {submittedSuccessRecord.summaryRating}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Filler Counter:</span>
                <strong className="text-slate-200">{submittedSuccessRecord.fillerCounterName}</strong>
              </div>
            </div>

            {/* Quick breakdown preview */}
            <div className="p-3 rounded-xl bg-[#081220] border border-[#1E2E48] grid grid-cols-3 gap-2 text-[10px] text-center font-mono">
              <div>Ah: <strong className="text-white">{submittedSuccessRecord.counts.ah}</strong></div>
              <div>Um: <strong className="text-white">{submittedSuccessRecord.counts.um}</strong></div>
              <div>Er: <strong className="text-white">{submittedSuccessRecord.counts.er}</strong></div>
              <div>Well: <strong className="text-white">{submittedSuccessRecord.counts.well}</strong></div>
              <div>So: <strong className="text-white">{submittedSuccessRecord.counts.so}</strong></div>
              <div>Like: <strong className="text-white">{submittedSuccessRecord.counts.like}</strong></div>
              <div>But: <strong className="text-white">{submittedSuccessRecord.counts.but}</strong></div>
              <div>Repeats: <strong className="text-white">{submittedSuccessRecord.counts.repeats}</strong></div>
              <div>Other: <strong className="text-white">{submittedSuccessRecord.counts.other}</strong></div>
            </div>

            <div className="pt-2 text-center">
              <span className="text-[10px] text-[#C5A880] font-cinzel font-bold tracking-widest uppercase">
                FEWER FILLERS. GREATER IMPACT.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetForNextSpeaker}
                className="flex-1 px-4 py-3 rounded-xl bg-[#C5A880] hover:bg-[#d8bd98] text-[#0A192F] font-cinzel font-bold text-xs shadow-lg transition-colors cursor-pointer"
              >
                Count Next Speaker
              </button>
              <button
                type="button"
                onClick={() => setSubmittedSuccessRecord(null)}
                className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-[#1E2E48] text-xs font-semibold transition-colors cursor-pointer"
              >
                Stay on Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SPEECH REPORT MODAL (Full Report Grouped by Speaker's Appointed Role) */}
      {/* ===================================================================== */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-4xl bg-[#050B14] border border-[#1E2E48] rounded-3xl p-5 sm:p-8 space-y-6 shadow-2xl max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1E2E48]">
              <div className="flex items-center gap-3">
                <SocietyLogo size="sm" className="border border-amber-500/40" />
                <div>
                  <h3 className="font-cinzel text-lg sm:text-2xl font-bold text-white tracking-wider flex items-center gap-2">
                    <span>Speech &amp; Filler Count Report</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-sans border border-amber-500/30">
                      {filteredReportRecords.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Official Filler Word evaluations organized by Speaker&apos;s Appointed Role
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {/* Meeting Filter Dropdown */}
                {meetingList.length > 0 && (
                  <select
                    value={reportMeetingFilter}
                    onChange={(e) => setReportMeetingFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-[#081220] border border-[#1E2E48] text-amber-300 text-xs font-semibold focus:outline-none focus:border-amber-400"
                  >
                    <option value="all">All Meetings ({records.length})</option>
                    {meetingList.map((m) => (
                      <option key={m} value={m}>
                        {m} ({records.filter((r) => r.meetingNumber === m).length})
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="p-2 rounded-xl bg-[#081220] hover:bg-[#0E1F36] text-slate-400 hover:text-white border border-[#1E2E48] transition-colors cursor-pointer"
                  title="Close Report"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Grouped by Role */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              {filteredReportRecords.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <Mic className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm text-slate-400">
                    No speech filler records found for this selection.
                  </p>
                </div>
              ) : (
                reportGroupedByRole.map(([roleName, roleRecords]) => (
                  <div key={roleName} className="space-y-3">
                    {/* Role Header Banner */}
                    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#0A192F] border border-amber-500/30">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-400" />
                        <span className="font-cinzel font-bold text-amber-300 text-sm tracking-wider uppercase">
                          {roleName}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          ({roleRecords.length} {roleRecords.length === 1 ? 'speaker' : 'speakers'})
                        </span>
                      </div>
                    </div>

                    {/* Speakers under this Role */}
                    <div className="grid grid-cols-1 gap-3">
                      {roleRecords.map((rec) => (
                        <div
                          key={rec.id || `${rec.speakerName}-${rec.createdAt}`}
                          className="p-4 sm:p-5 rounded-2xl bg-[#030712] border border-[#1E2E48] hover:border-amber-500/40 transition-colors space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E2E48]/60 pb-3">
                            <div>
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <h4 className="font-bold text-white text-base sm:text-lg tracking-wide">
                                  {rec.speakerName}
                                </h4>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 font-cinzel">
                                  {rec.meetingNumber}
                                </span>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-cinzel ${
                                    rec.summaryRating === 'Excellent'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                      : rec.summaryRating === 'Okay'
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  }`}
                                >
                                  {rec.summaryRating}
                                </span>
                              </div>
                              {rec.speakerDepartment && (
                                <div className="text-xs text-[#C5A880] font-medium mt-0.5">
                                  {rec.speakerDepartment}
                                </div>
                              )}
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-1">
                                <span>Date: {rec.date} {rec.time ? `• ${rec.time}` : ''}</span>
                                {rec.fillerCounterName && (
                                  <span>&bull; Evaluated by: {rec.fillerCounterName}</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 sm:self-center">
                              <div className="text-right">
                                <span className="text-[10px] text-slate-500 uppercase font-cinzel tracking-wider block">
                                  Total Fillers
                                </span>
                                <span className="font-mono text-2xl font-black text-teal-400 block">
                                  {rec.totalFillers}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteClick(rec)}
                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer ml-1"
                                title={`Delete filler record for ${rec.speakerName}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Breakdown pills */}
                          <div className="flex flex-wrap gap-2 text-xs font-mono">
                            <span className="px-2 py-1 rounded-lg bg-[#0E1F36] text-amber-300 border border-[#1E2E48]">Ah: {rec.counts.ah}</span>
                            <span className="px-2 py-1 rounded-lg bg-[#0E1F36] text-orange-300 border border-[#1E2E48]">Um: {rec.counts.um}</span>
                            <span className="px-2 py-1 rounded-lg bg-[#0E1F36] text-rose-300 border border-[#1E2E48]">Er: {rec.counts.er}</span>
                            <span className="px-2 py-1 rounded-lg bg-[#0E1F36] text-teal-300 border border-[#1E2E48]">Well: {rec.counts.well}</span>
                            <span className="px-2 py-1 rounded-lg bg-[#0E1F36] text-sky-300 border border-[#1E2E48]">So: {rec.counts.so}</span>
                            <span className="px-2 py-1 rounded-lg bg-[#0E1F36] text-purple-300 border border-[#1E2E48]">Like: {rec.counts.like}</span>
                            <span className="px-2 py-1 rounded-lg bg-[#0E1F36] text-indigo-300 border border-[#1E2E48]">But: {rec.counts.but}</span>
                            <span className="px-2 py-1 rounded-lg bg-[#0E1F36] text-emerald-300 border border-[#1E2E48]">Repeats: {rec.counts.repeats}</span>
                            {rec.counts.other > 0 && (
                              <span className="px-2 py-1 rounded-lg bg-[#0E1F36] text-cyan-300 border border-[#1E2E48]">Other: {rec.counts.other}</span>
                            )}
                          </div>

                          {rec.notes && (
                            <div className="text-xs text-slate-300 bg-[#081220] p-2.5 rounded-xl border border-[#1E2E48]/60 italic">
                              Note: {rec.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-[#1E2E48] flex justify-end">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-[#1E2E48] text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DELETE CONFIRMATION MODAL (Safe In-App Dialog, iframe-safe)           */}
      {/* ===================================================================== */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#050B14] border border-red-500/40 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-cinzel text-lg font-bold text-white">
                  Delete Filler Record?
                </h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#030712] border border-[#1E2E48] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Speaker:</span>
                <strong className="text-white">{recordToDelete.speakerName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Meeting:</span>
                <strong className="text-amber-300 font-cinzel">{recordToDelete.meetingNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Fillers:</span>
                <strong className="text-teal-400 font-mono font-black">{recordToDelete.totalFillers}</strong>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingRecord}
                onClick={() => setRecordToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-[#1E2E48] text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingRecord}
                onClick={handleExecuteDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-cinzel font-bold text-xs shadow-lg shadow-red-600/20 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {isDeletingRecord ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete</span>
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
