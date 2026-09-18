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
  ArrowRight,
  ArrowLeft,
  FileText,
  CheckSquare,
  BarChart3,
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
  const [evalToDelete, setEvalToDelete] = useState<SpeechEvaluationSheetData | null>(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState<boolean>(false);

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

  // Keep evaluatorName in sync with the logged-in user who fills the form
  useEffect(() => {
    if (userProfile.name && !activeEvalId) {
      setEvaluatorName(userProfile.name);
    }
  }, [userProfile.name, activeEvalId]);

  // Two-step navigation: Step 1 = Form (Choose Member, Role, Title, Meeting Number); Step 2 = Evaluation Sheet
  const [step, setStep] = useState<'form' | 'sheet'>('form');
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportMeetingFilter, setReportMeetingFilter] = useState<string>('all');

  const handleProceedToSheet = () => {
    if (!speakerName.trim()) {
      showToast('Please choose a member (Speaker) first.');
      setShowSpeakerDropdown(true);
      return;
    }
    if (!meetingNumber.trim()) {
      showToast('Please enter the Meeting Number.');
      return;
    }
    const existing = getStoredRecordForMember({ name: speakerName, gmail: speakerEmail });
    if (existing && (!activeEvalId || activeEvalId !== existing.id)) {
      showToast(`Evaluation for "${speakerName}" is already stored in ${meetingNumber}. Please choose another member.`);
      return;
    }
    setStep('sheet');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
    setStep('form');
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
    setShowReportModal(false);
    setStep('sheet');
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
        backgroundColor: '#06111F',
        onclone: (clonedDoc) => {
          // Sync input values so html2canvas captures them in golden-black styling
          const clonedInputs = clonedDoc.querySelectorAll('input');
          clonedInputs.forEach((input) => {
            const htmlInp = input as HTMLInputElement;
            htmlInp.setAttribute('value', htmlInp.value);
            htmlInp.style.color = '#E0E0E0';
            htmlInp.style.backgroundColor = '#06111F';
          });
          // Sync textarea text contents
          const clonedTextareas = clonedDoc.querySelectorAll('textarea');
          clonedTextareas.forEach((ta) => {
            const htmlTa = ta as HTMLTextAreaElement;
            htmlTa.textContent = htmlTa.value;
            htmlTa.style.color = '#E0E0E0';
            htmlTa.style.backgroundColor = '#06111F';
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

  const handleDeleteEvaluationClick = (e: React.MouseEvent, rec: SpeechEvaluationSheetData) => {
    e.stopPropagation();
    setEvalToDelete(rec);
  };

  const handleExecuteDeleteEvaluation = async () => {
    if (!evalToDelete) return;
    setIsDeletingRecord(true);
    const target = evalToDelete;

    // Optimistically update memory state immediately
    setEvaluationsHistory((prev) =>
      prev.filter((item) => {
        if (target.id && item.id && item.id === target.id) return false;
        if (target.createdAt && item.createdAt && item.createdAt === target.createdAt && item.speakerName === target.speakerName) {
          return false;
        }
        if (
          (item.speakerName || '').trim().toLowerCase() === (target.speakerName || '').trim().toLowerCase() &&
          (item.meetingNumber || item.speechTime || '').trim().toLowerCase() ===
            (target.meetingNumber || target.speechTime || '').trim().toLowerCase()
        ) {
          return false;
        }
        return true;
      })
    );

    if (activeEvalId && (activeEvalId === target.id)) {
      handleResetForm();
    }

    try {
      await deleteSpeechEvaluation(target);
      showToast(`Evaluation record for "${target.speakerName}" deleted.`);
    } catch (err) {
      console.error('Delete evaluation error:', err);
      showToast('Failed to delete evaluation record.');
    } finally {
      setIsDeletingRecord(false);
      setEvalToDelete(null);
    }
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

  // Helper to check if role is Key Note Speaker
  const isKeyNoteRole = (r: string) => /^key\s*note/i.test(r.trim());

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

  // Members explicitly appointed as Key Note Speaker
  const appointedKeyNoteSpeakers = useMemo(() => {
    return members.filter((m) => getMemberRoles(m).some(isKeyNoteRole));
  }, [members]);

  // Group members for the dropdown menu: prioritizing appointed Key Note Speakers
  const rolesWithMembers = useMemo(() => {
    const keyNotes = members.filter((m) => getMemberRoles(m).some(isKeyNoteRole));
    const otherMembers = members.filter((m) => !getMemberRoles(m).some(isKeyNoteRole));

    const groups: { role: string; members: RegisteredMember[] }[] = [];

    if (keyNotes.length > 0) {
      groups.push({
        role: 'Key Note Speaker',
        members: keyNotes,
      });
      if (otherMembers.length > 0) {
        groups.push({
          role: 'All Other Members (Evaluate as Key Note Speaker)',
          members: otherMembers,
        });
      }
    } else {
      // If admin has not yet explicitly tagged Key Note Speakers, all registered members are selectable
      groups.push({
        role: 'Key Note Speaker',
        members: members,
      });
    }

    if (speakerName.trim()) {
      const q = speakerName.toLowerCase().trim();
      return groups
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

    return groups;
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

  const handleSelectMember = (m: RegisteredMember, chosenRole: string = 'Key Note Speaker') => {
    const isAlreadyStored = Boolean(getStoredRecordForMember(m));
    if (isAlreadyStored) {
      showToast(`${m.name} is all ready stored for ${meetingNumber}. Please choose another member.`);
      return;
    }

    setSpeakerName(m.name);
    setSpeakerEmail(m.gmail || '');
    setSpeakerRole('Key Note Speaker');
    const deptFormatted =
      [m.department, m.year ? `(${m.year})` : ''].filter(Boolean).join(' ') ||
      m.department ||
      '';
    setSpeakerDepartment(deptFormatted);
    if (!speechTitle || speechTitle === 'Keynote Speech' || speechTitle.includes('Presentation')) {
      setSpeechTitle(`Keynote Speech`);
    }
    setShowSpeakerDropdown(false);
    showToast(`Selected Key Note Speaker: ${m.name}`);
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

  const ratingBreakdown = useMemo(() => {
    const counts: Record<string, number> = {
      'Excellent': 0,
      'Above Average': 0,
      'Satisfactory': 0,
      'Should Improve': 0,
      'Must Improve': 0,
    };
    Object.values(ratings).forEach((val) => {
      const lvl = String(val);
      if (lvl && counts[lvl] !== undefined) {
        counts[lvl]++;
      }
    });
    return counts;
  }, [ratings]);

  const renderSpeakerDropdownMenu = () => {
    if (!showSpeakerDropdown) return null;

    return (
      <div className="absolute top-full left-0 right-0 z-30 mt-1.5 bg-[#06111F] border border-[#BFA373]/30 rounded-2xl shadow-2xl overflow-hidden print:hidden animate-in fade-in slide-in-from-top-1">
        {/* Dropdown Header */}
        <div className="p-3 bg-[#06111F] border-b border-[#BFA373]/30 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[#BFA373] text-xs font-bold uppercase tracking-wider font-cinzel">
            <Mic className="w-3.5 h-3.5 text-amber-400" />
            <span>Key Note Speakers ({appointedKeyNoteSpeakers.length > 0 ? appointedKeyNoteSpeakers.length : members.length})</span>
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
        <div className="max-h-80 overflow-y-auto divide-y divide-[#BFA373]/20">
          {members.length === 0 ? (
            <div className="p-5 text-center space-y-2">
              <p className="text-xs text-amber-300 font-semibold">
                No members currently registered.
              </p>
              <p className="text-[11px] text-slate-400">
                Please register members or appoint speakers first.
              </p>
            </div>
          ) : rolesWithMembers.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No member matches &ldquo;{speakerName}&rdquo;
            </div>
          ) : (
            rolesWithMembers.map((item) => {
              const expanded = isRoleExpanded(item.role);

              return (
                <div key={item.role} className="bg-[#06111F]/60">
                  {/* Role Tag Header with Dropdown Arrow */}
                  <button
                    type="button"
                    onClick={() => toggleRole(item.role)}
                    className="w-full px-3.5 py-2.5 bg-[#06111F] hover:bg-slate-900 flex items-center justify-between transition-colors border-b border-[#BFA373]/20 cursor-pointer text-left"
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
                    <div className="divide-y divide-[#BFA373]/10 bg-[#06111F]">
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
                                : 'hover:bg-slate-900 text-white cursor-pointer'
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
                                <div className="text-xs text-[#BFA373] font-medium">
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
    );
  };

  return (
    <div className="w-full max-w-full space-y-6 text-slate-900 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#06111F] text-amber-300 border border-amber-500/50 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-medium animate-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Speech Report Top Bar */}
      <div className="print:hidden flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setShowReportModal(true)}
          className="px-5 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-cinzel font-bold text-sm flex items-center gap-2.5 transition-all cursor-pointer shadow-lg shadow-amber-500/10 hover:scale-[1.02] active:scale-95"
        >
          <Mic className="w-4 h-4 text-amber-400" />
          <span>Speech Report</span>
          {evaluationsHistory.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black">
              {evaluationsHistory.length}
            </span>
          )}
        </button>
      </div>

      {/* ===================================================================== */}
      {/* STEP 1: FORM (Choose Member + Speech Title + Meeting Number)          */}
      {/* ===================================================================== */}
      {step === 'form' && (
        <div className="p-6 sm:p-8 rounded-3xl bg-[#06111F] border border-[#BFA373]/30 shadow-2xl space-y-6 animate-in fade-in duration-300">
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
                        appointedKeyNoteSpeakers.length === 0 && members.length === 0
                          ? 'No members registered yet...'
                          : 'Click to choose Key Note Speaker...'
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

                  <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold shrink-0">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>Key Note Speaker</span>
                  </span>
                </div>

                {/* Warning if currently entered speaker is already stored */}
                {speakerName && getStoredRecordForMember({ name: speakerName, gmail: speakerEmail }) && (
                  <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>{speakerName}</strong>: All ready stored for {meetingNumber}. Please choose another member.
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

                {/* Speaker Scroll-Down Dropdown Menu */}
                {showSpeakerDropdown && renderSpeakerDropdownMenu()}
              </div>

              {speakerDepartment && (
                <p className="text-[11px] text-slate-400">
                  Department: <span className="text-[#BFA373] font-medium">{speakerDepartment}</span>
                </p>
              )}
            </div>

            {/* Speech Title */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#BFA373] font-cinzel uppercase tracking-wider">
                Speech Title:
              </label>
              <input
                type="text"
                value={speechTitle}
                onChange={(e) => setSpeechTitle(e.target.value)}
                placeholder="e.g. The Power of Vulnerability"
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

            {/* Evaluation Date */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#BFA373] font-cinzel uppercase tracking-wider">
                Evaluation Date:
              </label>
              <input
                type="date"
                value={evaluatorDate}
                onChange={(e) => setEvaluatorDate(e.target.value)}
                className="w-full px-3.5 py-3 bg-[#06111F] border border-[#BFA373]/30 rounded-xl focus:border-[#BFA373] focus:ring-1 focus:ring-[#BFA373] focus:outline-none text-white font-semibold transition-colors text-sm"
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
              onClick={handleProceedToSheet}
              className={`px-6 py-3 rounded-xl font-cinzel font-bold text-sm flex items-center gap-2 transition-all ${
                speakerName && getStoredRecordForMember({ name: speakerName, gmail: speakerEmail })
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-[#BFA373] hover:bg-[#BFA373] text-[#06111F] shadow-lg shadow-[#BFA373]/20 cursor-pointer hover:translate-x-0.5 active:scale-95'
              }`}
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 2: EVALUATION SHEET SCREEN                                      */}
      {/* ===================================================================== */}
      {step === 'sheet' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Active Session Info Bar with Back Button */}
          <div className="p-4 rounded-2xl bg-[#06111F] border border-[#BFA373]/30 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-[#BFA373]/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#BFA373]" />
                <span>Back</span>
              </button>

              <div className="text-xs flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-400">Evaluating Speaker: </span>
                <strong className="text-white text-sm">{speakerName}</strong>
                {speakerRole && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                    {speakerRole}
                  </span>
                )}
                <span className="text-slate-500 mx-1">&bull;</span>
                <span className="text-amber-400 font-cinzel font-bold">{meetingNumber}</span>
                {speechTitle && (
                  <>
                    <span className="text-slate-500 mx-1">&bull;</span>
                    <span className="text-slate-300 italic">&ldquo;{speechTitle}&rdquo;</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={isDownloadingPdf}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDownloadingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 text-white" />
                )}
                <span>PDF</span>
              </button>
            </div>
          </div>

          {/* Rating Progress Bar */}
          <div className="print:hidden rounded-xl bg-[#06111F]/80 border border-[#BFA373]/30 px-4 py-2.5 flex items-center justify-between text-xs text-slate-300">
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
        <div
          ref={sheetRef}
          id="printable-speech-evaluation-sheet"
          className="w-full bg-[#06111F] text-slate-100 border-2 border-[#BFA373]/50 shadow-2xl rounded-2xl overflow-hidden p-4 sm:p-6 lg:p-8 font-sans transition-all"
        >
        {/* ================= SPEAKER & TIME FIELDS ================= */}
        <div className="p-4 sm:p-5 bg-[#06111F] border border-[#BFA373]/30 rounded-xl space-y-3 shadow-inner">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs sm:text-sm">
            {/* Speaker Name Field - Standardized Appointed Roles Dropdown */}
            <div className="md:col-span-12 relative flex flex-col sm:flex-row sm:items-center gap-2.5">
              <label className="font-bold text-[#BFA373] font-cinzel shrink-0 min-w-[110px] tracking-wide flex items-center gap-1.5">
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
                        appointedKeyNoteSpeakers.length === 0 && members.length === 0
                          ? 'No members registered yet...'
                          : 'Click to choose Key Note Speaker...'
                      }
                      className="w-full pl-3 pr-10 py-2.5 bg-[#06111F] border border-[#BFA373]/30 rounded-xl focus:border-[#BFA373] focus:ring-1 focus:ring-[#BFA373] focus:outline-none text-white font-semibold placeholder:text-slate-500 transition-colors cursor-pointer text-sm"
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
                {renderSpeakerDropdownMenu()}
              </div>
            </div>

            {/* Speech Title Field */}
            <div className="md:col-span-8 flex flex-col sm:flex-row sm:items-center gap-2.5">
              <label className="font-bold text-[#BFA373] font-cinzel shrink-0 min-w-[110px] tracking-wide">
                Speech Title:
              </label>
              <input
                type="text"
                value={speechTitle}
                onChange={(e) => setSpeechTitle(e.target.value)}
                placeholder="e.g. The Power of Vulnerability"
                className="flex-1 px-3 py-2 bg-[#06111F] border border-[#BFA373]/30 rounded-lg focus:border-[#BFA373] focus:ring-1 focus:ring-[#BFA373] focus:outline-none text-white font-semibold placeholder:text-slate-500 transition-colors"
              />
            </div>

            {/* Meeting Number Field */}
            <div className="md:col-span-4 flex flex-col sm:flex-row sm:items-center gap-2.5">
              <label className="font-bold text-[#BFA373] font-cinzel shrink-0 tracking-wide">
                Meeting Number:
              </label>
              <input
                type="text"
                value={meetingNumber}
                onChange={(e) => setMeetingNumber(e.target.value)}
                placeholder="e.g. 1st Meeting"
                className="flex-1 px-3 py-2 bg-[#06111F] border border-[#BFA373]/30 rounded-lg focus:border-[#BFA373] focus:ring-1 focus:ring-[#BFA373] focus:outline-none text-white font-semibold placeholder:text-slate-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* ================= SUBHEADER MESSAGE ================= */}
        <div className="my-5 text-center space-y-1.5">
          <h3 className="font-cinzel text-sm sm:text-base font-bold text-[#BFA373] uppercase tracking-wider">
            YOUR EVALUATION OF THE PREPARED SPEAKER
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl mx-auto leading-relaxed italic">
            Feedback is vital. Please take a minute to share your honest feelings about the prepared
            speech. Please check the appropriate box for each category evaluated.
          </p>
        </div>

        {/* ================= SECTION 1 HEADING ================= */}
        <div className="bg-[#06111F] border border-[#BFA373]/30 text-[#BFA373] py-2.5 px-4 rounded-t-xl font-bold text-xs sm:text-sm tracking-wide font-cinzel">
          1. In my honest opinion, this is how I rated your speech in each of the following
          categories:
        </div>

        {/* ================= 18 CATEGORIES RATING TABLE (STRAIGHT 1 TO 18) ================= */}
        <div className="border-x border-b border-[#BFA373]/30 rounded-b-xl overflow-hidden bg-[#06111F]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-[#06111F] border-b border-[#BFA373]/30 text-[#BFA373]">
                  <th className="p-3 font-cinzel font-bold tracking-wider">
                    Category (1 to 18)
                  </th>
                  {RATING_LEVELS.map((lvl) => (
                    <th
                      key={lvl}
                      className="p-2 text-center font-bold text-[10px] sm:text-xs w-16 sm:w-28 border-l border-[#BFA373]/30 leading-tight"
                    >
                      {lvl}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#BFA373]/30">
                {ALL_CATEGORIES.map((cat) => {
                  const current = ratings[cat.id];
                  return (
                    <tr
                      key={cat.id}
                      className="hover:bg-[#06111F]/60 transition-colors group"
                    >
                      <td className="p-3">
                        <div className="font-semibold text-white text-xs sm:text-sm leading-snug group-hover:text-[#BFA373] transition-colors">
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
                            className={`p-2 text-center border-l border-[#BFA373]/30 cursor-pointer select-none transition-all ${
                              isChecked ? 'bg-[#BFA373]/15' : 'hover:bg-slate-800/40'
                            }`}
                            title={`${cat.title}: ${lvl}`}
                          >
                            <div
                              className={`w-6 h-6 sm:w-7 sm:h-7 mx-auto rounded-md flex items-center justify-center transition-all ${
                                isChecked
                                  ? 'border-2 border-[#BFA373] bg-[#BFA373]/20 text-[#BFA373] shadow-sm shadow-[#BFA373]/30 font-bold'
                                  : 'border border-slate-700 bg-[#06111F] text-transparent hover:border-[#BFA373]/60'
                              }`}
                            >
                              {isChecked && (
                                <span className="text-sm sm:text-base font-black leading-none text-[#BFA373]">
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
          <div className="border border-[#BFA373]/30 bg-[#06111F] rounded-xl p-3.5 flex flex-col min-h-[150px] shadow-sm">
            <h4 className="font-bold text-xs sm:text-sm text-[#BFA373] border-b border-[#BFA373]/30 pb-2 uppercase font-cinzel">
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
              className="w-full flex-1 p-2.5 text-xs sm:text-sm text-slate-100 bg-[#06111F] border border-[#BFA373]/30 rounded-lg resize-y focus:outline-none focus:border-[#BFA373] placeholder:text-slate-500 font-sans mt-2.5 leading-relaxed"
            />
          </div>

          {/* Section 3 */}
          <div className="border border-[#BFA373]/30 bg-[#06111F] rounded-xl p-3.5 flex flex-col min-h-[150px] shadow-sm">
            <h4 className="font-bold text-xs sm:text-sm text-[#BFA373] border-b border-[#BFA373]/30 pb-2 uppercase font-cinzel">
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
              className="w-full flex-1 p-2.5 text-xs sm:text-sm text-slate-100 bg-[#06111F] border border-[#BFA373]/30 rounded-lg resize-y focus:outline-none focus:border-[#BFA373] placeholder:text-slate-500 font-sans mt-2.5 leading-relaxed"
            />
          </div>

          {/* Section 4 */}
          <div className="border border-[#BFA373]/30 bg-[#06111F] rounded-xl p-3.5 flex flex-col min-h-[150px] shadow-sm">
            <h4 className="font-bold text-xs sm:text-sm text-[#BFA373] border-b border-[#BFA373]/30 pb-2 uppercase font-cinzel">
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
              className="w-full flex-1 p-2.5 text-xs sm:text-sm text-slate-100 bg-[#06111F] border border-[#BFA373]/30 rounded-lg resize-y focus:outline-none focus:border-[#BFA373] placeholder:text-slate-500 font-sans mt-2.5 leading-relaxed"
            />
          </div>
        </div>

        {/* ================= SECTION 5 (ACTION PLAN) ================= */}
        <div className="mt-3.5 border border-[#BFA373]/30 bg-[#06111F] rounded-xl p-3.5 shadow-sm">
          <h4 className="font-bold text-xs sm:text-sm text-[#BFA373] border-b border-[#BFA373]/30 pb-2 uppercase font-cinzel">
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
            className="w-full p-2.5 text-xs sm:text-sm text-slate-100 bg-[#06111F] border border-[#BFA373]/30 rounded-lg resize-y focus:outline-none focus:border-[#BFA373] placeholder:text-slate-500 font-sans mt-2.5 leading-relaxed"
          />
        </div>

        {/* ================= OVERALL EVALUATION & SIGN-OFF ================= */}
        <div className="mt-5 pt-4 border-t border-[#BFA373]/30 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs sm:text-sm">
          {/* Overall Rating Selection */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-[#BFA373] uppercase font-cinzel">
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
                        ? 'border-[#BFA373] bg-[#BFA373] text-slate-950 font-bold shadow-md shadow-[#BFA373]/20'
                        : 'border-[#BFA373]/30 text-slate-300 hover:border-[#BFA373] bg-[#06111F]'
                    }`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Evaluator & Date Sign-off */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#BFA373] font-cinzel">Evaluator:</span>
              <span className="px-3 py-1.5 bg-[#06111F] border border-[#BFA373]/30 rounded-lg font-semibold text-white text-xs">
                {evaluatorName || userProfile.name || 'Speech Evaluator'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#BFA373] font-cinzel">Date:</span>
              <input
                type="date"
                value={evaluatorDate}
                onChange={(e) => setEvaluatorDate(e.target.value)}
                className="px-2.5 py-1.5 bg-[#06111F] border border-[#BFA373]/30 rounded-lg focus:border-[#BFA373] focus:outline-none font-semibold text-white text-xs"
              />
            </div>
          </div>
        </div>

        {/* ================= FOOTER QUOTE BANNER ================= */}
        <div className="mt-5 bg-[#06111F] border border-[#BFA373]/30 text-[#BFA373] py-3 px-4 text-center rounded-xl">
          <p className="font-serif italic text-sm sm:text-base tracking-wide font-medium">
            &ldquo;Great speeches are not born, they are crafted.&rdquo;
          </p>
        </div>
      </div>

          {/* ================= ACTIONS BAR (NON-PRINT) FOR STEP 2 ================= */}
          <div className="print:hidden rounded-2xl bg-[#06111F] p-4 sm:p-5 border border-[#BFA373]/30 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 hover:text-white border border-[#BFA373]/30 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-[#BFA373]/30 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-[#BFA373]/30 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <History className="w-4 h-4 text-amber-400" />
                <span>Saved History ({evaluationsHistory.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={isDownloadingPdf}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-rose-600/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDownloadingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4 text-white" />
                )}
                <span>Download PDF</span>
              </button>

              {/* Send to Speaker Activity Button */}
              <button
                type="button"
                onClick={handleSendSuggestionsToSpeakerActivity}
                disabled={isSubmittingToActivity}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-[#BFA373] to-amber-600 hover:brightness-110 text-[#06111F] font-bold text-xs sm:text-sm flex items-center gap-2.5 shadow-xl shadow-amber-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50 font-cinzel tracking-wider"
                title="Save and deliver this evaluation to the chosen Key Note Speaker's Activity tab"
              >
                {isSubmittingToActivity ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Delivering to Speaker Activity...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-[#06111F]" />
                    <span>Send Suggestions to Speaker Activity</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SPEECH REPORT MODAL (Full Screen, Role Grouping, Name & Department)  */}
      {/* ===================================================================== */}
      {showReportModal && (() => {
        // Distinct meeting numbers
        const distinctMeetings = Array.from(
          new Set(evaluationsHistory.map((e) => e.meetingNumber || e.speechTime).filter(Boolean))
        );
        const filteredEvalsForReport =
          reportMeetingFilter === 'all'
            ? evaluationsHistory
            : evaluationsHistory.filter(
                (e) => (e.meetingNumber || e.speechTime) === reportMeetingFilter
              );

        // Group evaluations by role
        const roleGroups: { role: string; records: SpeechEvaluationSheetData[] }[] = [];
        const seenRoles = new Set<string>();

        filteredEvalsForReport.forEach((rec) => {
          const rName = (rec.speakerRole || 'Key Note Speaker').trim();
          const key = rName.toLowerCase();
          if (!seenRoles.has(key)) {
            seenRoles.add(key);
            roleGroups.push({
              role: rName,
              records: filteredEvalsForReport.filter(
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
                    {filteredEvalsForReport.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-sans font-black">
                        {filteredEvalsForReport.length}
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
                    <option value="all">All Meetings ({evaluationsHistory.length})</option>
                    {distinctMeetings.map((m) => (
                      <option key={m} value={m}>
                        {m} ({evaluationsHistory.filter((r) => (r.meetingNumber || r.speechTime) === m).length})
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-3.5 sm:px-4 py-2 rounded-xl bg-[#06111F] hover:bg-slate-900 text-slate-300 hover:text-white border border-[#BFA373]/30 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
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
                  <FileText className="w-12 h-12 text-slate-600 mx-auto" />
                  <p className="text-base text-slate-300 font-semibold font-cinzel">
                    No speech evaluations recorded yet.
                  </p>
                  <p className="text-xs text-slate-500">
                    Choose a member in Step 1, evaluate them in Step 2, and submit to record their report here!
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
                        </div>
                        <span className="text-xs text-slate-400 font-semibold">
                          {group.records.length} {group.records.length === 1 ? 'Speaker' : 'Speakers'}
                        </span>
                      </div>

                      {/* Speakers in this Role */}
                      <div className="grid grid-cols-1 gap-4">
                        {group.records.map((rec, recIdx) => {
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

                          const ratedCountForRec = Object.keys(rec.ratings || {}).length;

                          return (
                            <div
                              key={rec.id || recIdx}
                              className="p-4 sm:p-6 rounded-2xl bg-[#06111F] border border-[#BFA373]/30 hover:border-amber-500/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl"
                            >
                              {/* Left: Speaker Details & Ratings */}
                              <div className="space-y-2 flex-1 min-w-0">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <h4 className="font-bold text-white text-base sm:text-lg">
                                    {rec.speakerName}
                                  </h4>
                                  {rec.overallEvaluation && (
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                        rec.overallEvaluation === 'Excellent'
                                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                          : rec.overallEvaluation === 'Above Average'
                                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                          : rec.overallEvaluation === 'Satisfactory'
                                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                      }`}
                                    >
                                      {rec.overallEvaluation}
                                    </span>
                                  )}
                                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono border border-slate-700">
                                    {ratedCountForRec}/18 Scored
                                  </span>
                                </div>

                                {deptStr ? (
                                  <p className="text-xs text-[#BFA373] font-medium">
                                    {deptStr}
                                  </p>
                                ) : null}

                                <div className="flex items-center gap-2 pt-0.5 text-xs text-slate-400 flex-wrap">
                                  <span className="font-cinzel font-semibold text-amber-300/80">
                                    {rec.meetingNumber || rec.speechTime}
                                  </span>
                                  {rec.speechTitle && (
                                    <>
                                      <span>&bull;</span>
                                      <span className="text-slate-300 italic">
                                        &ldquo;{rec.speechTitle}&rdquo;
                                      </span>
                                    </>
                                  )}
                                  <span>&bull;</span>
                                  <span className="text-[11px] text-slate-500">{rec.date}</span>
                                  <span>&bull;</span>
                                  <span className="text-[11px] text-slate-500">
                                    Evaluator: {rec.evaluatorName || 'Speech Evaluator'}
                                  </span>
                                </div>

                                {/* Commendation & Recommendation previews */}
                                {(rec.commend1 || rec.recommend) && (
                                  <div className="pt-2 text-xs text-slate-300 space-y-1">
                                    {rec.commend1 && (
                                      <p className="line-clamp-1">
                                        <strong className="text-emerald-400">Commend:</strong>{' '}
                                        {rec.commend1}
                                      </p>
                                    )}
                                    {rec.recommend && (
                                      <p className="line-clamp-1">
                                        <strong className="text-amber-400">Recommend:</strong>{' '}
                                        {rec.recommend}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Right: Actions (Open Sheet, Download PDF, Delete) */}
                              <div className="flex items-center gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#BFA373]/20">
                                <button
                                  type="button"
                                  onClick={() => handleSelectPastEvaluation(rec)}
                                  className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                  title="Open in Evaluation Sheet"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Open Sheet</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleSelectPastEvaluation(rec);
                                    setTimeout(() => handleDownloadPDF(), 300);
                                  }}
                                  className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-[#BFA373]/30 transition-colors cursor-pointer"
                                  title="Download PDF"
                                >
                                  <FileDown className="w-4 h-4 text-rose-400" />
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteEvaluationClick(e, rec)}
                                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
                                  title="Delete evaluation record"
                                >
                                  <Trash2 className="w-4 h-4" />
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
                Showing {filteredEvalsForReport.length} evaluation{filteredEvalsForReport.length !== 1 ? 's' : ''} across {roleGroups.length} role{roleGroups.length !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="text-amber-400 hover:underline cursor-pointer"
              >
                Back to Evaluation
              </button>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* SAVED EVALUATIONS HISTORY MODAL                                           */}
      {/* ========================================================================= */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 print:hidden animate-in fade-in">
          <div className="bg-[#06111F] border border-[#BFA373]/30 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#BFA373]/30 flex items-center justify-between bg-[#06111F]">
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
                        : 'bg-[#06111F] border-[#BFA373]/30 hover:border-slate-600'
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
                        onClick={(e) => handleDeleteEvaluationClick(e, item)}
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
            <div className="p-3 border-t border-[#BFA373]/30 flex justify-end bg-[#06111F]">
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

      {/* ========================================================================= */}
      {/* IN-APP CONFIRMATION MODAL (Reliable inside iframe / sandboxed browsers)   */}
      {/* ========================================================================= */}
      {evalToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#06111F] border border-[#BFA373]/40 rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-cinzel font-bold text-white text-base">
                  Delete Speech Evaluation?
                </h3>
                <p className="text-xs text-slate-400">
                  This evaluation record will be permanently deleted from reports.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#06111F] border border-[#BFA373]/30 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Speaker:</span>
                <span className="font-bold text-white text-sm">{evalToDelete.speakerName}</span>
              </div>
              {evalToDelete.speakerDepartment ? (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Department:</span>
                  <span className="font-medium text-[#BFA373]">{evalToDelete.speakerDepartment}</span>
                </div>
              ) : null}
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Role:</span>
                <span className="font-medium text-amber-300">{evalToDelete.speakerRole || 'Speaker'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Meeting:</span>
                <span className="font-medium text-white">{evalToDelete.meetingNumber || evalToDelete.speechTime || '1st Meeting'}</span>
              </div>
              {evalToDelete.speechTitle ? (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Speech Title:</span>
                  <span className="font-medium text-slate-200 truncate max-w-[200px]">{evalToDelete.speechTitle}</span>
                </div>
              ) : null}
              {evalToDelete.overallEvaluation ? (
                <div className="flex justify-between items-center pt-2 border-t border-[#BFA373]/30">
                  <span className="text-slate-400">Overall Rating:</span>
                  <span className="font-black text-amber-400 text-xs px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40">
                    {evalToDelete.overallEvaluation}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                disabled={isDeletingRecord}
                onClick={() => setEvalToDelete(null)}
                className="flex-1 px-4 py-3 rounded-xl bg-[#06111F] hover:bg-slate-800 text-slate-300 hover:text-white border border-[#BFA373]/30 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingRecord}
                onClick={handleExecuteDeleteEvaluation}
                className="flex-1 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeletingRecord ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Evaluation</span>
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
