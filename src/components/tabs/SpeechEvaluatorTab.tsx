import React, { useState, useEffect, useMemo, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  UserProfile,
  SpeechEvaluationSheetData,
  EvaluationRatingLevel,
  RegisteredMember,
} from '../../types';
import { SocietyLogo } from '../SocietyLogo';
import {
  saveSpeechEvaluation,
  subscribeToSpeechEvaluations,
  deleteSpeechEvaluation,
  subscribeToRegisteredMembers,
  sendAppMessage,
} from '../../firebase';
import {
  Printer,
  Save,
  RotateCcw,
  CheckCircle2,
  FileCheck,
  History,
  Trash2,
  Share2,
  User,
  Clock,
  Mic,
  Calendar,
  Sparkles,
  ChevronDown,
  X,
  ExternalLink,
  Info,
  FileDown,
  Loader2,
  Send,
  Award,
} from 'lucide-react';

interface SpeechEvaluatorTabProps {
  userProfile: UserProfile;
}

const RATING_LEVELS: EvaluationRatingLevel[] = [
  'Excellent',
  'Above Average',
  'Satisfactory',
  'Should Improve',
  'Must Improve',
];

const ALL_CATEGORIES = [
  {
    id: 1,
    title: '1. Speech Value',
    desc: '(interesting, meaningful, memorable)',
  },
  {
    id: 2,
    title: '2. Preparation',
    desc: '(researched, well written, choreographed, dressed appropriately)',
  },
  {
    id: 3,
    title: '3. Delivery Manner',
    desc: '(direct, confident, earnest, enthusiastic, with conviction)',
  },
  {
    id: 4,
    title: '4. Opening',
    desc: '(attention getting, arousing, led into topic)',
  },
  {
    id: 5,
    title: '5. Body of Speech/Transitions',
    desc: '(logical, clear flow of ideas, points supported by facts and stories)',
  },
  {
    id: 6,
    title: '6. Conclusion',
    desc: '(effective, climactic)',
  },
  {
    id: 7,
    title: '7. Notes/lectern',
    desc: '(no notes or notes used sparingly, was lectern placement an issue)',
  },
  {
    id: 8,
    title: '8. Posture, Movement',
    desc: '(natural, purposeful, expressive, smooth)',
  },
  {
    id: 9,
    title: '9. Audience Attention & Participation',
    desc: '(held audience attention)',
  },
  {
    id: 10,
    title: '10. Facial Expressions',
    desc: '(animated, friendly, genuine, expressive)',
  },
  {
    id: 11,
    title: '11. Eye Contact',
    desc: '(established visual bonds, all of audience)',
  },
  {
    id: 12,
    title: '12. Vocal Quality',
    desc: '(volume, rate, pitch, tone, vitality, articulation, variety)',
  },
  {
    id: 13,
    title: '13. Language/Words',
    desc: '(appropriate for audience, specific, created vivid images)',
  },
  {
    id: 14,
    title: '14. Grammar',
    desc: "(appropriate use of words, outstanding phrases, less 'ah's and crutch phrases)",
  },
  {
    id: 15,
    title: '15. Humour',
    desc: '(Appropriate, reinforced message, entertaining)',
  },
  {
    id: 16,
    title: '16. Timing/Pauses',
    desc: '(appropriate, enhanced humour, strengthened the ideas presented)',
  },
  {
    id: 17,
    title: '17. Visual Aids/Props',
    desc: '(simple, visible, easy to understand)',
  },
  {
    id: 18,
    title: '18. Manual Goals',
    desc: '(Met all goals in manual for the chosen project)',
  },
];

const getTodayDateString = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

export const SpeechEvaluatorTab: React.FC<SpeechEvaluatorTabProps> = ({ userProfile }) => {
  const [members, setMembers] = useState<RegisteredMember[]>([]);
  const [evaluationsHistory, setEvaluationsHistory] = useState<SpeechEvaluationSheetData[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [activeEvalId, setActiveEvalId] = useState<string | null>(null);
  const [clubName, setClubName] = useState<string>('Sri Amaraavathi College of Arts & Science, Karur');
  const [areaNumber, setAreaNumber] = useState<string>('9');
  const [speakerName, setSpeakerName] = useState<string>('');
  const [speakerEmail, setSpeakerEmail] = useState<string>('');
  const [speakerRole, setSpeakerRole] = useState<string>('Key Note Speaker');
  const [speakerDepartment, setSpeakerDepartment] = useState<string>('');
  const [speechTitle, setSpeechTitle] = useState<string>('');
  const [meetingNumber, setMeetingNumber] = useState<string>('1st Meeting');
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});
  const [ratings, setRatings] = useState<Record<number, EvaluationRatingLevel | ''>>({});
  const [commend1, setCommend1] = useState<string>('');
  const [recommend, setRecommend] = useState<string>('');
  const [commend2, setCommend2] = useState<string>('');
  const [actionPlan, setActionPlan] = useState<string>('');
  const [overallEvaluation, setOverallEvaluation] = useState<EvaluationRatingLevel | ''>('');
  const [evaluatorName, setEvaluatorName] = useState<string>(userProfile.name || 'Speech Evaluator');
  const [evaluatorDate, setEvaluatorDate] = useState<string>(getTodayDateString());

  const [showSpeakerDropdown, setShowSpeakerDropdown] = useState<boolean>(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubMembers = subscribeToRegisteredMembers((data) => {
      setMembers(data);
    });
    const unsubEvals = subscribeToSpeechEvaluations((data) => {
      setEvaluationsHistory(data);
    });

    return () => {
      unsubMembers();
      unsubEvals();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleRatingClick = (catId: number, level: EvaluationRatingLevel) => {
    setRatings((prev) => ({
      ...prev,
      [catId]: prev[catId] === level ? '' : level,
    }));
  };

  const handleResetForm = () => {
    setActiveEvalId(null);
    setSpeakerName('');
    setSpeakerEmail('');
    setSpeakerRole('Key Note Speaker');
    setSpeakerDepartment('');
    setSpeechTitle('');
    setMeetingNumber('1st Meeting');
    setRatings({});
    setCommend1('');
    setRecommend('');
    setCommend2('');
    setActionPlan('');
    setOverallEvaluation('');
    setEvaluatorName(userProfile.name || 'Speech Evaluator');
    setEvaluatorDate(getTodayDateString());
    showToast('Evaluation sheet reset.');
  };

  const handleSelectPastEvaluation = (item: SpeechEvaluationSheetData) => {
    setActiveEvalId(item.id || null);
    setClubName(item.clubName || 'Sri Amaraavathi College of Arts & Science, Karur');
    setAreaNumber(item.areaNumber || '9');
    setSpeakerName(item.speakerName || '');
    setSpeakerEmail(item.speakerEmail || '');
    setSpeakerRole(item.speakerRole || 'Key Note Speaker');
    setSpeakerDepartment(item.speakerDepartment || '');
    setSpeechTitle(item.speechTitle || '');
    setMeetingNumber(item.meetingNumber || item.speechTime || '1st Meeting');
    setRatings(item.ratings || {});
    setCommend1(item.commend1 || '');
    setRecommend(item.recommend || '');
    setCommend2(item.commend2 || '');
    setActionPlan(item.actionPlan || '');
    setOverallEvaluation(item.overallEvaluation || '');
    setEvaluatorName(item.evaluatorName || userProfile.name || '');
    setEvaluatorDate(item.date || getTodayDateString());
    setShowHistoryModal(false);
    showToast(`Loaded evaluation for ${item.speakerName || 'speaker'}`);
  };

  // Auto-save evaluation data to Firestore and local cache
  useEffect(() => {
    if (!speakerName.trim()) return;
    const timer = setTimeout(async () => {
      const payload: SpeechEvaluationSheetData = {
        id: activeEvalId || undefined,
        clubName,
        areaNumber,
        speakerName: speakerName.trim(),
        speakerEmail: speakerEmail.trim(),
        speakerRole: speakerRole.trim() || 'Key Note Speaker',
        speakerDepartment: speakerDepartment.trim(),
        speechTitle: speechTitle.trim(),
        meetingNumber: (meetingNumber || '1st Meeting').trim(),
        speechTime: (meetingNumber || '1st Meeting').trim(),
        ratings,
        commend1: commend1.trim(),
        recommend: recommend.trim(),
        commend2: commend2.trim(),
        actionPlan: actionPlan.trim(),
        overallEvaluation,
        evaluatorName: evaluatorName.trim() || userProfile.name || 'Evaluator',
        evaluatorEmail: userProfile.gmail || '',
        date: evaluatorDate,
      };
      const res = await saveSpeechEvaluation(payload);
      if (res.success && res.id && !activeEvalId) {
        setActiveEvalId(res.id);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [
    speakerName,
    speakerEmail,
    speakerRole,
    speakerDepartment,
    speechTitle,
    meetingNumber,
    ratings,
    commend1,
    recommend,
    commend2,
    actionPlan,
    overallEvaluation,
    evaluatorName,
    evaluatorDate,
    activeEvalId,
    clubName,
    areaNumber,
    userProfile.name,
    userProfile.gmail,
  ]);

  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  const handleDownloadPDF = async () => {
    if (!sheetRef.current) return;
    setIsDownloadingPdf(true);
    showToast('Generating PDF, please wait...');

    try {
      // Auto-save current evaluation before generating PDF
      if (speakerName.trim()) {
        const payload: SpeechEvaluationSheetData = {
          id: activeEvalId || undefined,
          clubName,
          areaNumber,
          speakerName: speakerName.trim(),
          speakerEmail: speakerEmail.trim(),
          speechTitle: speechTitle.trim(),
          meetingNumber: (meetingNumber || '1st Meeting').trim(),
          speechTime: (meetingNumber || '1st Meeting').trim(),
          ratings,
          commend1: commend1.trim(),
          recommend: recommend.trim(),
          commend2: commend2.trim(),
          actionPlan: actionPlan.trim(),
          overallEvaluation,
          evaluatorName: evaluatorName.trim() || userProfile.name || 'Evaluator',
          evaluatorEmail: userProfile.gmail || '',
          date: evaluatorDate,
        };
        await saveSpeechEvaluation(payload);
      }

      const element = sheetRef.current;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#050B14',
        onclone: (clonedDoc) => {
          // Sync input values so html2canvas captures them in golden-black styling
          const clonedInputs = clonedDoc.querySelectorAll('input');
          clonedInputs.forEach((input) => {
            const htmlInp = input as HTMLInputElement;
            htmlInp.setAttribute('value', htmlInp.value);
            htmlInp.style.color = '#FFFFFF';
            htmlInp.style.backgroundColor = '#030712';
          });
          // Sync textarea text contents
          const clonedTextareas = clonedDoc.querySelectorAll('textarea');
          clonedTextareas.forEach((ta) => {
            const htmlTa = ta as HTMLTextAreaElement;
            htmlTa.textContent = htmlTa.value;
            htmlTa.style.color = '#F1F5F9';
            htmlTa.style.backgroundColor = '#030712';
          });
        },
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const margin = 6;
      const contentWidth = pdfWidth - margin * 2;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      if (contentHeight <= pdfHeight - margin * 2) {
        pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight);
      } else {
        // Multi-page slicing so the straight 1 to 18 categories and feedback are crystal clear
        let remainingHeight = contentHeight;
        let page = 0;
        const printableHeight = pdfHeight - margin * 2;

        while (remainingHeight > 0) {
          if (page > 0) {
            pdf.addPage();
          }
          pdf.addImage(
            imgData,
            'JPEG',
            margin,
            margin - page * printableHeight,
            contentWidth,
            contentHeight
          );
          remainingHeight -= printableHeight;
          page++;
        }
      }

      const safeSpeakerName = speakerName.trim()
        ? speakerName.trim().replace(/[^a-zA-Z0-9_-]/g, '_')
        : 'Speaker';
      const filename = `Speech_Evaluation_${safeSpeakerName}_${evaluatorDate || 'Sheet'}.pdf`;

      pdf.save(filename);
      showToast('PDF downloaded successfully!');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      showToast('Downloading via Print dialog...');
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDeleteEvaluation = async (e: React.MouseEvent, id?: string) => {
    e.stopPropagation();
    if (!id) return;
    const ok = window.confirm('Are you sure you want to delete this evaluation record?');
    if (!ok) return;
    await deleteSpeechEvaluation(id);
    if (activeEvalId === id) {
      handleResetForm();
    }
    showToast('Evaluation deleted.');
  };

  const handlePrintSheet = () => {
    window.print();
  };

  // Helper to format roles
  const formatSpeakerRole = (r: string): string => {
    const s = r.trim();
    if (/^key\s*note\s*speaker(s)?$/i.test(s)) return 'Key Note Speaker';
    if (/^role\s*player(s)?$/i.test(s)) return 'Role Player';
    if (/^evaluator(\s*\(feedbacker\))?$/i.test(s)) return 'Evaluator (Feedbacker)';
    if (/^quick\s*think\s*speaker(s)?$/i.test(s)) return 'Quick Think Speaker';
    if (/^filler\s*counter(s)?$/i.test(s)) return 'Filler Counter';
    if (/^time\s*steward(s)?$/i.test(s)) return 'Time Steward';
    if (/^toastmaster\s*of\s*the\s*day$/i.test(s)) return 'Toastmaster of the Day';
    if (/^general\s*evaluator$/i.test(s)) return 'General Evaluator';
    if (/^grammarian$/i.test(s)) return 'Grammarian';
    if (/^table\s*topics\s*master$/i.test(s)) return 'Table Topics Master';
    if (/^timer$/i.test(s)) return 'Time Steward';
    if (/^ah\s*counter$/i.test(s)) return 'Filler Counter';
    return s.replace(/\b\w/g, (c) => c.toUpperCase());
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

  // Appointed members appointed by Admin into ANY speaker role
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
      'Toastmaster of the Day',
      'General Evaluator',
      'Grammarian',
      'Table Topics Master',
    ];

    members.forEach((m) => {
      const userRoles = getMemberRoles(m);
      userRoles.forEach((role) => {
        if (!roleMap.has(role)) {
          roleMap.set(role, []);
        }
        const list = roleMap.get(role)!;
        if (!list.some((existing) => existing.id === m.id || (m.gmail && existing.gmail === m.gmail))) {
          list.push(m);
        }
      });
    });

    const result: { role: string; members: RegisteredMember[] }[] = [];

    standardOrder.forEach((role) => {
      if (roleMap.has(role)) {
        result.push({ role, members: roleMap.get(role)! });
        roleMap.delete(role);
      }
    });

    roleMap.forEach((mems, role) => {
      result.push({ role, members: mems });
    });

    if (speakerName.trim()) {
      const q = speakerName.toLowerCase().trim();
      return result
        .map((grp) => ({
          role: grp.role,
          members: grp.members.filter(
            (m) =>
              (m.name || '').toLowerCase().includes(q) ||
              (m.department || '').toLowerCase().includes(q)
          ),
        }))
        .filter((grp) => grp.members.length > 0);
    }

    return result;
  }, [members, speakerName]);

  const toggleRole = (role: string) => {
    setExpandedRoles((prev) => ({
      ...prev,
      [role]: prev[role] !== undefined ? !prev[role] : false,
    }));
  };

  const isRoleExpanded = (role: string) => {
    return expandedRoles[role] ?? true;
  };

  // Helper to check if evaluation for a member is already stored
  const getStoredRecordForMember = (member: { name?: string; gmail?: string }) => {
    if (!member.name && !member.gmail) return null;
    const curMeeting = (meetingNumber || '1st Meeting').trim().toLowerCase();
    return evaluationsHistory.find((ev) => {
      if (activeEvalId && ev.id === activeEvalId) return false;
      const nameMatches = Boolean(
        member.name &&
        (ev.speakerName || '').trim().toLowerCase() === member.name.trim().toLowerCase()
      );
      const emailMatches = Boolean(
        member.gmail &&
        ev.speakerEmail &&
        ev.speakerEmail.trim().toLowerCase() === member.gmail.trim().toLowerCase()
      );
      if (!nameMatches && !emailMatches) return false;

      const recMeeting = (ev.meetingNumber || ev.speechTime || '1st Meeting').trim().toLowerCase();
      return recMeeting === curMeeting;
    });
  };

  const handleSelectMember = (m: RegisteredMember, chosenRole: string) => {
    const isAlreadyStored = Boolean(getStoredRecordForMember(m));
    if (isAlreadyStored) {
      showToast(`${m.name} is all ready stored for ${meetingNumber}. Please choose another member.`);
      return;
    }

    setSpeakerName(m.name);
    setSpeakerEmail(m.gmail || '');
    setSpeakerRole(chosenRole);
    const deptFormatted =
      [m.department, m.year ? `(${m.year})` : ''].filter(Boolean).join(' ') ||
      m.department ||
      '';
    setSpeakerDepartment(deptFormatted);
    if (!speechTitle || speechTitle === 'Keynote Speech') {
      setSpeechTitle(`${chosenRole} Presentation`);
    }
    setShowSpeakerDropdown(false);
    showToast(`Selected ${m.name} (${chosenRole})`);
  };

  const [isSubmittingToActivity, setIsSubmittingToActivity] = useState<boolean>(false);

  const handleSendSuggestionsToSpeakerActivity = async () => {
    if (!speakerName.trim()) {
      showToast('Please select an appointed member first.');
      setShowSpeakerDropdown(true);
      return;
    }

    const existing = getStoredRecordForMember({ name: speakerName, gmail: speakerEmail });
    if (existing && (!activeEvalId || activeEvalId !== existing.id)) {
      showToast(`Evaluation for "${speakerName}" is already stored in ${meetingNumber}. Please choose another member.`);
      return;
    }

    setIsSubmittingToActivity(true);
    try {
      const payload: SpeechEvaluationSheetData = {
        id: activeEvalId || undefined,
        clubName,
        areaNumber,
        speakerName: speakerName.trim(),
        speakerEmail: speakerEmail.trim(),
        speakerRole: speakerRole.trim() || 'Key Note Speaker',
        speakerDepartment: speakerDepartment.trim(),
        speechTitle: speechTitle.trim() || `${speakerRole || 'Speaker'} Presentation`,
        meetingNumber: (meetingNumber || '1st Meeting').trim(),
        speechTime: (meetingNumber || '1st Meeting').trim(),
        ratings,
        commend1: commend1.trim(),
        recommend: recommend.trim(),
        commend2: commend2.trim(),
        actionPlan: actionPlan.trim(),
        overallEvaluation,
        evaluatorName: evaluatorName.trim() || userProfile.name || 'Speech Evaluator',
        evaluatorEmail: userProfile.gmail || '',
        date: evaluatorDate || new Date().toISOString().split('T')[0],
      };

      const res = await saveSpeechEvaluation(payload);
      if (res.success && res.id && !activeEvalId) {
        setActiveEvalId(res.id);
      }

      const meetingFolderTag = (meetingNumber || '1st Meeting').trim();

      // Send in-app notification message to the speaker so they are notified immediately
      if (speakerEmail.trim()) {
        await sendAppMessage({
          type: 'general',
          title: `Feedbacker Suggestion Received (${meetingFolderTag})!`,
          message: `Feedbacker ${evaluatorName || userProfile.name} has submitted an evaluation sheet for your speech "${speechTitle || 'Presentation'}" in your "${meetingFolderTag}" folder. Open your Activity tab to view.`,
          targetEmail: speakerEmail.trim().toLowerCase(),
          createdAt: new Date().toISOString(),
          createdBy: {
            name: evaluatorName || userProfile.name || 'Speech Evaluator',
            gmail: userProfile.gmail || '',
            photoUrl: userProfile.photoUrl || '',
          },
          readBy: [],
        }).catch((e) => console.warn('Notification send note:', e));
      }

      showToast(`Evaluation stored in ${speakerName}'s Activity tab inside '${meetingFolderTag}' folder!`);
    } catch (err) {
      console.error('Failed to submit evaluation to activity:', err);
      showToast('Failed to send evaluation. Please try again.');
    } finally {
      setIsSubmittingToActivity(false);
    }
  };

  const ratedCount = useMemo(() => {
    return Object.values(ratings).filter(Boolean).length;
  }, [ratings]);

  return (
    <div className="w-full max-w-full space-y-6 text-slate-900 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#0F284E] text-amber-300 border border-amber-500/50 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-medium animate-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Title Bar (Non-print) */}
      <div className="print:hidden rounded-2xl bg-[#081220] p-4 sm:p-5 border border-[#1E2E48] shadow-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <FileCheck className="w-5 h-5" />
          </span>
          <div className="flex items-center gap-2">
            <h2 className="font-cinzel text-lg sm:text-xl font-bold text-white tracking-wide">
              Speech Evaluator Sheet
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white shadow-sm">
              NEW
            </span>
          </div>
        </div>

        {/* PDF Download Button - In the exact boxed position */}
        <button
          type="button"
          onClick={handleDownloadPDF}
          disabled={isDownloadingPdf}
          className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-rose-600/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          title="Download Speech Evaluation as PDF"
        >
          {isDownloadingPdf ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating PDF...</span>
            </>
          ) : (
            <>
              <FileDown className="w-4 h-4 text-white" />
              <span>PDF</span>
            </>
          )}
        </button>
      </div>

      {/* RATING PROGRESS BAR (Non-print) */}
      <div className="print:hidden rounded-xl bg-[#081220]/80 border border-[#1E2E48] px-4 py-2.5 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-400" />
          <span>
            Evaluation Progress:{' '}
            <strong className="text-amber-400 font-mono">{ratedCount} / 18</strong> categories rated
          </span>
        </div>
        <span className="text-[11px] text-slate-400 hidden sm:inline">
          Click the cells in the sheet below to rate
        </span>
      </div>

      {/* ========================================================================= */}
      {/* THE PRINTABLE AUTHENTIC SPEECH EVALUATION SHEET CONTAINER                  */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* THE SPEECH EVALUATION SHEET CONTAINER - GOLDEN & BLACK THEME              */}
      {/* ========================================================================= */}
      <div
        ref={sheetRef}
        id="printable-speech-evaluation-sheet"
        className="w-full bg-[#050B14] text-slate-100 border-2 border-[#C5A880]/50 shadow-2xl rounded-2xl overflow-hidden p-4 sm:p-6 lg:p-8 font-sans transition-all"
      >
        {/* ================= SPEAKER & TIME FIELDS ================= */}
        <div className="p-4 sm:p-5 bg-[#081220] border border-[#1E2E48] rounded-xl space-y-3 shadow-inner">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs sm:text-sm">
            {/* Speaker Name Field - Standardized Appointed Roles Dropdown */}
            <div className="md:col-span-12 relative flex flex-col sm:flex-row sm:items-center gap-2.5">
              <label className="font-bold text-[#C5A880] font-cinzel shrink-0 min-w-[110px] tracking-wide flex items-center gap-1.5">
                <span>Speaker:</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-normal">
                  Role
                </span>
              </label>
              <div className="relative flex-1">
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
                      className="w-full pl-3 pr-10 py-2.5 bg-[#030712] border border-[#1E2E48] rounded-xl focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] focus:outline-none text-white font-semibold placeholder:text-slate-500 transition-colors cursor-pointer text-sm"
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
                        <strong>{speakerName}</strong>: All ready stored ({meetingNumber}). Please choose another member.
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
                  <div className="absolute top-full left-0 right-0 z-30 mt-1.5 bg-[#081220] border border-[#1E2E48] rounded-2xl shadow-2xl overflow-hidden print:hidden animate-in fade-in slide-in-from-top-1">
                    {/* Dropdown Header */}
                    <div className="p-3 bg-[#050B14] border-b border-[#1E2E48] flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[#C5A880] text-xs font-bold uppercase tracking-wider font-cinzel">
                        <Mic className="w-3.5 h-3.5 text-amber-400" />
                        <span>Appointed Members ({appointedSpeakers.length})</span>
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
                                            ? `All ready stored for ${m.name} (${meetingNumber})`
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
                                                Evaluated
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

            {/* Speech Title Field */}
            <div className="md:col-span-8 flex flex-col sm:flex-row sm:items-center gap-2.5">
              <label className="font-bold text-[#C5A880] font-cinzel shrink-0 min-w-[110px] tracking-wide">
                Speech Title:
              </label>
              <input
                type="text"
                value={speechTitle}
                onChange={(e) => setSpeechTitle(e.target.value)}
                placeholder="e.g. The Power of Vulnerability"
                className="flex-1 px-3 py-2 bg-[#030712] border border-[#1E2E48] rounded-lg focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] focus:outline-none text-white font-semibold placeholder:text-slate-500 transition-colors"
              />
            </div>

            {/* Meeting Number Field */}
            <div className="md:col-span-4 flex flex-col sm:flex-row sm:items-center gap-2.5">
              <label className="font-bold text-[#C5A880] font-cinzel shrink-0 tracking-wide">
                Meeting Number:
              </label>
              <input
                type="text"
                value={meetingNumber}
                onChange={(e) => setMeetingNumber(e.target.value)}
                placeholder="e.g. 1st Meeting"
                className="flex-1 px-3 py-2 bg-[#030712] border border-[#1E2E48] rounded-lg focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] focus:outline-none text-white font-semibold placeholder:text-slate-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* ================= SUBHEADER MESSAGE ================= */}
        <div className="my-5 text-center space-y-1.5">
          <h3 className="font-cinzel text-sm sm:text-base font-bold text-[#C5A880] uppercase tracking-wider">
            YOUR EVALUATION OF THE PREPARED SPEAKER
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl mx-auto leading-relaxed italic">
            Feedback is vital. Please take a minute to share your honest feelings about the prepared
            speech. Please check the appropriate box for each category evaluated.
          </p>
        </div>

        {/* ================= SECTION 1 HEADING ================= */}
        <div className="bg-[#0B1528] border border-[#C5A880]/30 text-[#C5A880] py-2.5 px-4 rounded-t-xl font-bold text-xs sm:text-sm tracking-wide font-cinzel">
          1. In my honest opinion, this is how I rated your speech in each of the following
          categories:
        </div>

        {/* ================= 18 CATEGORIES RATING TABLE (STRAIGHT 1 TO 18) ================= */}
        <div className="border-x border-b border-[#1E2E48] rounded-b-xl overflow-hidden bg-[#081220]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#0B1728] border-b border-[#1E2E48] text-[#C5A880]">
                  <th className="p-3 font-cinzel font-bold tracking-wider">
                    Category (1 to 18)
                  </th>
                  {RATING_LEVELS.map((lvl) => (
                    <th
                      key={lvl}
                      className="p-2 text-center font-bold text-[10px] sm:text-xs w-16 sm:w-28 border-l border-[#1E2E48] leading-tight"
                    >
                      {lvl}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2E48]">
                {ALL_CATEGORIES.map((cat) => {
                  const current = ratings[cat.id];
                  return (
                    <tr
                      key={cat.id}
                      className="hover:bg-[#0E1F36]/60 transition-colors group"
                    >
                      <td className="p-3">
                        <div className="font-semibold text-white text-xs sm:text-sm leading-snug group-hover:text-[#C5A880] transition-colors">
                          {cat.title}
                        </div>
                        <div className="text-[11px] text-slate-400 leading-snug italic mt-0.5">
                          {cat.desc}
                        </div>
                      </td>
                      {RATING_LEVELS.map((lvl) => {
                        const isChecked = current === lvl;
                        return (
                          <td
                            key={lvl}
                            onClick={() => handleRatingClick(cat.id, lvl)}
                            className={`p-2 text-center border-l border-[#1E2E48] cursor-pointer select-none transition-all ${
                              isChecked ? 'bg-[#C5A880]/15' : 'hover:bg-slate-800/40'
                            }`}
                            title={`${cat.title}: ${lvl}`}
                          >
                            <div
                              className={`w-6 h-6 sm:w-7 sm:h-7 mx-auto rounded-md flex items-center justify-center transition-all ${
                                isChecked
                                  ? 'border-2 border-[#C5A880] bg-[#C5A880]/20 text-[#C5A880] shadow-sm shadow-[#C5A880]/30 font-bold'
                                  : 'border border-slate-700 bg-[#030712] text-transparent hover:border-[#C5A880]/60'
                              }`}
                            >
                              {isChecked && (
                                <span className="text-sm sm:text-base font-black leading-none text-[#C5A880]">
                                  &#10003;
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ================= SECTIONS 2, 3, 4 (COMMEND, RECOMMEND, COMMEND) ================= */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Section 2 */}
          <div className="border border-[#1E2E48] bg-[#081220] rounded-xl p-3.5 flex flex-col min-h-[150px] shadow-sm">
            <h4 className="font-bold text-xs sm:text-sm text-[#C5A880] border-b border-[#1E2E48] pb-2 uppercase font-cinzel">
              2. COMMEND{' '}
              <span className="font-normal lowercase font-sans text-[11px] text-slate-400">
                (What was done well)
              </span>
            </h4>
            <textarea
              rows={4}
              value={commend1}
              onChange={(e) => setCommend1(e.target.value)}
              placeholder="Highlight strengths, confidence, stage presence, opening punch, vocal variety..."
              className="w-full flex-1 p-2.5 text-xs sm:text-sm text-slate-100 bg-[#030712] border border-[#1E2E48] rounded-lg resize-y focus:outline-none focus:border-[#C5A880] placeholder:text-slate-500 font-sans mt-2.5 leading-relaxed"
            />
          </div>

          {/* Section 3 */}
          <div className="border border-[#1E2E48] bg-[#081220] rounded-xl p-3.5 flex flex-col min-h-[150px] shadow-sm">
            <h4 className="font-bold text-xs sm:text-sm text-[#C5A880] border-b border-[#1E2E48] pb-2 uppercase font-cinzel">
              3. RECOMMEND{' '}
              <span className="font-normal lowercase font-sans text-[11px] text-slate-400">
                (Suggestions for improvement)
              </span>
            </h4>
            <textarea
              rows={4}
              value={recommend}
              onChange={(e) => setRecommend(e.target.value)}
              placeholder="Provide constructive points for speech flow, pauses, eye contact, body language..."
              className="w-full flex-1 p-2.5 text-xs sm:text-sm text-slate-100 bg-[#030712] border border-[#1E2E48] rounded-lg resize-y focus:outline-none focus:border-[#C5A880] placeholder:text-slate-500 font-sans mt-2.5 leading-relaxed"
            />
          </div>

          {/* Section 4 */}
          <div className="border border-[#1E2E48] bg-[#081220] rounded-xl p-3.5 flex flex-col min-h-[150px] shadow-sm">
            <h4 className="font-bold text-xs sm:text-sm text-[#C5A880] border-b border-[#1E2E48] pb-2 uppercase font-cinzel">
              4. COMMEND{' '}
              <span className="font-normal lowercase font-sans text-[11px] text-slate-400">
                (What to keep doing/continue)
              </span>
            </h4>
            <textarea
              rows={4}
              value={commend2}
              onChange={(e) => setCommend2(e.target.value)}
              placeholder="Key memorable moments, humor, relatable stories to continue in next speeches..."
              className="w-full flex-1 p-2.5 text-xs sm:text-sm text-slate-100 bg-[#030712] border border-[#1E2E48] rounded-lg resize-y focus:outline-none focus:border-[#C5A880] placeholder:text-slate-500 font-sans mt-2.5 leading-relaxed"
            />
          </div>
        </div>

        {/* ================= SECTION 5 (ACTION PLAN) ================= */}
        <div className="mt-3.5 border border-[#1E2E48] bg-[#081220] rounded-xl p-3.5 shadow-sm">
          <h4 className="font-bold text-xs sm:text-sm text-[#C5A880] border-b border-[#1E2E48] pb-2 uppercase font-cinzel">
            5. ACTION PLAN{' '}
            <span className="font-normal lowercase font-sans text-[11px] text-slate-400">
              (One key action the speaker can take for the next speech)
            </span>
          </h4>
          <textarea
            rows={2}
            value={actionPlan}
            onChange={(e) => setActionPlan(e.target.value)}
            placeholder="Single most actionable focus area for the upcoming speech..."
            className="w-full p-2.5 text-xs sm:text-sm text-slate-100 bg-[#030712] border border-[#1E2E48] rounded-lg resize-y focus:outline-none focus:border-[#C5A880] placeholder:text-slate-500 font-sans mt-2.5 leading-relaxed"
          />
        </div>

        {/* ================= OVERALL EVALUATION & SIGN-OFF ================= */}
        <div className="mt-5 pt-4 border-t border-[#1E2E48] flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs sm:text-sm">
          {/* Overall Rating Selection */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-[#C5A880] uppercase font-cinzel">
              OVERALL EVALUATION:
            </span>
            <div className="flex items-center flex-wrap gap-1.5">
              {RATING_LEVELS.map((lvl) => {
                const isSelected = overallEvaluation === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setOverallEvaluation(isSelected ? '' : lvl)}
                    className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#C5A880] bg-[#C5A880] text-slate-950 font-bold shadow-md shadow-[#C5A880]/20'
                        : 'border-[#1E2E48] text-slate-300 hover:border-[#C5A880] bg-[#081220]'
                    }`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Evaluator & Date Sign-off */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#C5A880] font-cinzel">Evaluator:</span>
              <input
                type="text"
                value={evaluatorName}
                onChange={(e) => setEvaluatorName(e.target.value)}
                placeholder="Evaluator's name"
                className="w-40 px-2.5 py-1.5 bg-[#030712] border border-[#1E2E48] rounded-lg focus:border-[#C5A880] focus:outline-none font-semibold text-white text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#C5A880] font-cinzel">Date:</span>
              <input
                type="date"
                value={evaluatorDate}
                onChange={(e) => setEvaluatorDate(e.target.value)}
                className="px-2.5 py-1.5 bg-[#030712] border border-[#1E2E48] rounded-lg focus:border-[#C5A880] focus:outline-none font-semibold text-white text-xs"
              />
            </div>
          </div>
        </div>

        {/* ================= FOOTER QUOTE BANNER ================= */}
        <div className="mt-5 bg-[#081220] border border-[#C5A880]/30 text-[#C5A880] py-3 px-4 text-center rounded-xl">
          <p className="font-serif italic text-sm sm:text-base tracking-wide font-medium">
            &ldquo;Great speeches are not born, they are crafted.&rdquo;
          </p>
        </div>
      </div>

      {/* ================= ACTIONS BAR (NON-PRINT) ================= */}
      <div className="print:hidden rounded-2xl bg-[#081220] p-4 sm:p-5 border border-[#1E2E48] shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetForm}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-[#1E2E48] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Sheet</span>
          </button>
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-[#1E2E48] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <History className="w-4 h-4 text-amber-400" />
            <span>Saved History ({evaluationsHistory.length})</span>
          </button>
        </div>

        {/* Send to Speaker Activity Button */}
        <button
          type="button"
          onClick={handleSendSuggestionsToSpeakerActivity}
          disabled={isSubmittingToActivity}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-[#C5A880] to-amber-600 hover:brightness-110 text-[#050B14] font-bold text-xs sm:text-sm flex items-center gap-2.5 shadow-xl shadow-amber-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 font-cinzel tracking-wider"
          title="Save and deliver this evaluation to the chosen Key Note Speaker's Activity tab"
        >
          {isSubmittingToActivity ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Delivering to Speaker Activity...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4 text-[#050B14]" />
              <span>Send Suggestions to Speaker Activity</span>
            </>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SAVED EVALUATIONS HISTORY MODAL                                           */}
      {/* ========================================================================= */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 print:hidden animate-in fade-in">
          <div className="bg-[#081220] border border-[#1E2E48] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#1E2E48] flex items-center justify-between bg-[#050B14]">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                <h3 className="font-cinzel font-bold text-white text-base">
                  Saved Speech Evaluations ({evaluationsHistory.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
              {evaluationsHistory.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No saved speech evaluations yet. Fill in the form and click{' '}
                  <strong className="text-amber-400">&ldquo;Save Evaluation&rdquo;</strong>.
                </div>
              ) : (
                evaluationsHistory.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectPastEvaluation(item)}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      activeEvalId === item.id
                        ? 'bg-amber-950/40 border-amber-500/60'
                        : 'bg-[#030712] border-[#1E2E48] hover:border-slate-600'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm truncate">
                          {item.speakerName || 'Unnamed Speaker'}
                        </h4>
                        {item.overallEvaluation && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {item.overallEvaluation}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        Title: {item.speechTitle || 'Speech'} &bull; Meeting: {item.meetingNumber || item.speechTime || '1st Meeting'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Evaluator: {item.evaluatorName} &bull; Date: {item.date}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteEvaluation(e, item.id)}
                        className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900 border border-rose-500/40 text-rose-300 hover:text-white transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-[#1E2E48] flex justify-end bg-[#050B14]">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
