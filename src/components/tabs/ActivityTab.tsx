import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  UserProfile,
  SidebarTab,
  SpeechEvaluationSheetData,
  EvaluationRatingLevel,
  TimeStewardRecord,
  FillerCounterRecord,
} from '../../types';
import {
  subscribeToSpeechEvaluations,
  subscribeToTimeStewardRecords,
  subscribeToFillerCounterRecords,
} from '../../firebase';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  Activity,
  FileCheck,
  Eye,
  Lock,
  Calendar,
  Clock,
  User,
  Sparkles,
  X,
  FileDown,
  Loader2,
  ChevronRight,
  Info,
  CheckCircle2,
  MessageSquare,
  Award,
  Folder,
  FolderOpen,
  ArrowLeft,
  Timer,
  AlertCircle,
  Filter,
} from 'lucide-react';

const getRecordDurationSeconds = (rec: TimeStewardRecord | null | undefined): number => {
  if (!rec) return 0;
  if (typeof rec.durationSeconds === 'number' && rec.durationSeconds >= 0) {
    return rec.durationSeconds;
  }
  if (typeof (rec as any).seconds === 'number' && (rec as any).seconds >= 0) {
    return (rec as any).seconds;
  }
  if (rec.formattedTime && rec.formattedTime.includes(':')) {
    const parts = rec.formattedTime.split(':').map((p) => parseInt(p, 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
  }
  return 0;
};

interface ActivityTabProps {
  userProfile: UserProfile;
  onNavigateTab?: (tab: SidebarTab) => void;
}

interface EvaluationCategory {
  id: number;
  title: string;
  desc: string;
}

const EVALUATION_CATEGORIES: EvaluationCategory[] = [
  { id: 1, title: '1. Speech Development', desc: '(structure, opening, body, conclusion)' },
  { id: 2, title: '2. Effectiveness', desc: '(purpose, audience interest, reaction)' },
  { id: 3, title: '3. Speech Value', desc: '(meaningful message, original thinking)' },
  { id: 4, title: '4. Preparation', desc: '(organized thoughts, smooth progression)' },
  { id: 5, title: '5. Manner', desc: '(confident, poised, enthusiastic)' },
  { id: 6, title: '6. Physical Appearance', desc: '(neat, professional stage readiness)' },
  { id: 7, title: '7. Directness', desc: '(spoke straight to audience, conversational)' },
  { id: 8, title: '8. Posture', desc: '(balanced, upright, steady stage presence)' },
  { id: 9, title: '9. Gestures', desc: '(natural, varied, purposeful movement)' },
  { id: 10, title: '10. Facial Expressions', desc: '(animated, friendly, genuine, expressive)' },
  { id: 11, title: '11. Eye Contact', desc: '(established visual bonds, all of audience)' },
  { id: 12, title: '12. Vocal Quality', desc: '(volume, rate, pitch, tone, vitality, articulation, variety)' },
  { id: 13, title: '13. Language/Words', desc: '(appropriate for audience, specific, created vivid images)' },
  { id: 14, title: '14. Grammar', desc: "(appropriate use of words, outstanding phrases, less 'ah's and crutch phrases)" },
  { id: 15, title: '15. Humour', desc: '(Appropriate, reinforced message, entertaining)' },
  { id: 16, title: '16. Timing/Pauses', desc: '(appropriate, enhanced humour, strengthened the ideas presented)' },
  { id: 17, title: '17. Visual Aids/Props', desc: '(simple, visible, easy to understand)' },
  { id: 18, title: '18. Manual Goals', desc: '(Met all goals in manual for the chosen project)' },
];

const RATING_COLUMNS: EvaluationRatingLevel[] = [
  'Excellent',
  'Above Average',
  'Satisfactory',
  'Should Improve',
  'Must Improve',
];

export const ActivityTab: React.FC<ActivityTabProps> = ({ userProfile, onNavigateTab }) => {
  const [suggestions, setSuggestions] = useState<SpeechEvaluationSheetData[]>([]);
  const [timingRecords, setTimingRecords] = useState<TimeStewardRecord[]>([]);
  const [fillerRecords, setFillerRecords] = useState<FillerCounterRecord[]>([]);
  const [isEvalLoading, setIsEvalLoading] = useState<boolean>(true);
  const [isTimingLoading, setIsTimingLoading] = useState<boolean>(true);
  const [isFillerLoading, setIsFillerLoading] = useState<boolean>(true);
  const [openedFolder, setOpenedFolder] = useState<string | null>(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState<SpeechEvaluationSheetData | null>(null);
  const [selectedTimingRecord, setSelectedTimingRecord] = useState<TimeStewardRecord | null>(null);
  const [selectedFillerRecord, setSelectedFillerRecord] = useState<FillerCounterRecord | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const sheetModalRef = useRef<HTMLDivElement>(null);

  const isLoading = isEvalLoading && isTimingLoading && isFillerLoading;

  // Group evaluations, timing records & filler records together by meeting name / number (e.g. "1st Meeting")
  const meetingFolders = useMemo(() => {
    const map = new Map<
      string,
      {
        folderName: string;
        evaluations: SpeechEvaluationSheetData[];
        timings: TimeStewardRecord[];
        fillers: FillerCounterRecord[];
        latestDate: string;
        speechTitles: string[];
        evaluators: string[];
        timeStewards: string[];
        fillerCounters: string[];
      }
    >();

    // 1. Process feedbacker evaluations
    suggestions.forEach((item) => {
      const raw = (item.meetingNumber || item.speechTime || '1st Meeting').trim();
      const folderKey = raw || '1st Meeting';
      if (!map.has(folderKey)) {
        map.set(folderKey, {
          folderName: folderKey,
          evaluations: [],
          timings: [],
          fillers: [],
          latestDate: '',
          speechTitles: [],
          evaluators: [],
          timeStewards: [],
          fillerCounters: [],
        });
      }
      const group = map.get(folderKey)!;
      group.evaluations.push(item);
      if (item.date && (!group.latestDate || item.date > group.latestDate)) {
        group.latestDate = item.date;
      }
      if (item.speechTitle && !group.speechTitles.includes(item.speechTitle)) {
        group.speechTitles.push(item.speechTitle);
      }
      if (item.evaluatorName && !group.evaluators.includes(item.evaluatorName)) {
        group.evaluators.push(item.evaluatorName);
      }
    });

    // 2. Process time steward records
    timingRecords.forEach((item) => {
      const raw = (item.meetingNumber || '1st Meeting').trim();
      const folderKey = raw || '1st Meeting';
      if (!map.has(folderKey)) {
        map.set(folderKey, {
          folderName: folderKey,
          evaluations: [],
          timings: [],
          fillers: [],
          latestDate: '',
          speechTitles: [],
          evaluators: [],
          timeStewards: [],
          fillerCounters: [],
        });
      }
      const group = map.get(folderKey)!;
      group.timings.push(item);
      if (item.date && (!group.latestDate || item.date > group.latestDate)) {
        group.latestDate = item.date;
      }
      if (item.speechTitle && !group.speechTitles.includes(item.speechTitle)) {
        group.speechTitles.push(item.speechTitle);
      }
      if (item.timeStewardName && !group.timeStewards.includes(item.timeStewardName)) {
        group.timeStewards.push(item.timeStewardName);
      }
    });

    // 3. Process filler counter records
    fillerRecords.forEach((item) => {
      const raw = (item.meetingNumber || '1st Meeting').trim();
      const folderKey = raw || '1st Meeting';
      if (!map.has(folderKey)) {
        map.set(folderKey, {
          folderName: folderKey,
          evaluations: [],
          timings: [],
          fillers: [],
          latestDate: '',
          speechTitles: [],
          evaluators: [],
          timeStewards: [],
          fillerCounters: [],
        });
      }
      const group = map.get(folderKey)!;
      group.fillers.push(item);
      if (item.date && (!group.latestDate || item.date > group.latestDate)) {
        group.latestDate = item.date;
      }
      if (item.roleOrTitle && !group.speechTitles.includes(item.roleOrTitle)) {
        group.speechTitles.push(item.roleOrTitle);
      }
      if (item.fillerCounterName && !group.fillerCounters.includes(item.fillerCounterName)) {
        group.fillerCounters.push(item.fillerCounterName);
      }
    });

    return Array.from(map.values()).map((g) => ({
      ...g,
      totalCount: g.evaluations.length + g.timings.length + g.fillers.length,
    }));
  }, [suggestions, timingRecords, fillerRecords]);

  // Current folder data
  const currentFolderData = useMemo(() => {
    if (!openedFolder) return null;
    return (
      meetingFolders.find(
        (f) => f.folderName.toLowerCase() === openedFolder.toLowerCase()
      ) || null
    );
  }, [openedFolder, meetingFolders]);

  useEffect(() => {
    const userEmail = (userProfile.gmail || '').trim().toLowerCase();
    const userName = (userProfile.name || '').trim().toLowerCase();

    const unsubEvals = subscribeToSpeechEvaluations((allEvals) => {
      // Filter evaluations for the currently logged-in user as speaker
      const mySuggestions = allEvals.filter((ev) => {
        const evEmail = (ev.speakerEmail || '').trim().toLowerCase();
        const evName = (ev.speakerName || '').trim().toLowerCase();

        if (userEmail && evEmail && userEmail === evEmail) return true;
        if (userName && evName && userName === evName) return true;
        return false;
      });

      setSuggestions(mySuggestions);
      setIsEvalLoading(false);
    });

    const unsubTimings = subscribeToTimeStewardRecords((allTimings) => {
      // Filter timings for the currently logged-in user as speaker
      const myTimings = allTimings.filter((t) => {
        const tEmail = (t.speakerEmail || '').trim().toLowerCase();
        const tName = (t.speakerName || '').trim().toLowerCase();

        if (userEmail && tEmail && userEmail === tEmail) return true;
        if (userName && tName && userName === tName) return true;
        return false;
      });

      setTimingRecords(myTimings);
      setIsTimingLoading(false);
    });

    const unsubFillers = subscribeToFillerCounterRecords((allFillers) => {
      // Filter filler records for the currently logged-in user as speaker
      const myFillers = allFillers.filter((f) => {
        const fEmail = (f.speakerEmail || '').trim().toLowerCase();
        const fName = (f.speakerName || '').trim().toLowerCase();

        if (userEmail && fEmail && userEmail === fEmail) return true;
        if (userName && fName && userName === fName) return true;
        return false;
      });

      setFillerRecords(myFillers);
      setIsFillerLoading(false);
    });

    return () => {
      unsubEvals();
      unsubTimings();
      unsubFillers();
    };
  }, [userProfile.gmail, userProfile.name]);

  const handleDownloadPDF = async () => {
    if (!sheetModalRef.current || !selectedEvaluation) return;
    setIsDownloadingPdf(true);

    try {
      const element = sheetModalRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#06111F',
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
        let remainingHeight = contentHeight;
        let page = 0;
        const printableHeight = pdfHeight - margin * 2;

        while (remainingHeight > 0) {
          if (page > 0) pdf.addPage();
          pdf.addImage(imgData, 'JPEG', margin, margin - page * printableHeight, contentWidth, contentHeight);
          remainingHeight -= printableHeight;
          page++;
        }
      }

      const safeSpeakerName = (selectedEvaluation.speakerName || 'Speaker').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeMeeting = (selectedEvaluation.meetingNumber || selectedEvaluation.speechTime || '1st_Meeting').replace(/[^a-zA-Z0-9_-]/g, '_');
      pdf.save(`Feedbacker_Suggestion_${safeSpeakerName}_${safeMeeting}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF from activity:', err);
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const getRatingBadgeStyle = (rating?: string) => {
    switch (rating) {
      case 'Excellent':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40';
      case 'Above Average':
        return 'bg-sky-950/60 text-sky-300 border-sky-500/40';
      case 'Satisfactory':
        return 'bg-amber-950/60 text-amber-300 border-amber-500/40';
      case 'Should Improve':
        return 'bg-orange-950/60 text-orange-300 border-orange-500/40';
      case 'Must Improve':
        return 'bg-rose-950/60 text-rose-300 border-rose-500/40';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 animate-in fade-in duration-300">
      {/* Main Section */}
      <div className="space-y-4">
        {/* Loading State */}
        {isLoading ? (
          <div className="p-12 text-center rounded-2xl bg-[#06111F] border border-[#BFA373]/30 space-y-3">
            <Loader2 className="w-8 h-8 text-[#BFA373] animate-spin mx-auto" />
            <p className="text-slate-400 text-sm">Loading your activity records...</p>
          </div>
        ) : meetingFolders.length === 0 ? (
          /* Empty State */
          <div className="p-8 sm:p-14 text-center rounded-3xl bg-[#06111F] border border-[#BFA373]/30 shadow-xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#06111F] border border-[#BFA373]/30 text-[#BFA373] flex items-center justify-center mx-auto shadow-inner">
              <Folder className="w-8 h-8 text-[#BFA373]" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h4 className="font-cinzel text-lg font-bold text-white">
                No Meeting Folders Yet
              </h4>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                Your activity section is currently empty. When your Feedbacker or Time Steward records your keynote speech with a meeting number (such as <strong className="text-[#BFA373]">&ldquo;1st Meeting&rdquo;</strong>) and submits it, your dedicated meeting folder will be automatically created right here with your feedback forms and official speech timings stored inside!
              </p>
            </div>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#06111F] text-slate-400 border border-[#BFA373]/30">
                <User className="w-3.5 h-3.5 text-[#BFA373]" />
                Viewing Activity for: {userProfile.name || 'Member'}
              </span>
            </div>
          </div>
        ) : openedFolder ? (
          /* ========================================================================= */
          /* INSIDE OPENED MEETING FOLDER (e.g. "1st Meeting")                         */
          /* ========================================================================= */
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Breadcrumb Navigation & Back Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-[#06111F] border border-[#BFA373]/30">
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <button
                  type="button"
                  onClick={() => setOpenedFolder(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-[#BFA373]/30 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#BFA373]" />
                  <span>All Folders</span>
                </button>
                <span className="text-slate-500">/</span>
                <span className="font-cinzel font-bold text-amber-300 flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4 text-amber-400" />
                  {openedFolder}
                </span>
              </div>

              {/* Quick Switch to other folders */}
              {meetingFolders.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Switch:</span>
                  {meetingFolders.map((f) => (
                    <button
                      key={f.folderName}
                      type="button"
                      onClick={() => setOpenedFolder(f.folderName)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        openedFolder.toLowerCase() === f.folderName.toLowerCase()
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                          : 'bg-[#06111F] text-slate-400 hover:text-white border border-[#BFA373]/30'
                      }`}
                    >
                      {f.folderName}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* List of Feedback Forms & Time Records in this folder */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Feedbacker Evaluation Cards */}
              {currentFolderData?.evaluations.map((item) => {
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedEvaluation(item)}
                    className="group relative overflow-hidden rounded-2xl bg-[#06111F] border border-[#BFA373]/30 hover:border-[#BFA373] p-5 shadow-lg hover:shadow-2xl hover:shadow-[#BFA373]/10 transition-all cursor-pointer flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Card Top Pill */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#06111F] border border-[#BFA373]/30 text-[#BFA373] text-[11px] font-bold font-cinzel tracking-wider">
                          <FileCheck className="w-3.5 h-3.5 text-[#BFA373]" />
                          <span>FEEDBACKER SUGGESTION</span>
                        </div>
                      </div>

                      {/* Speech Title & Info */}
                      <div className="space-y-1">
                        <h4 className="font-cinzel text-base sm:text-lg font-bold text-white group-hover:text-[#BFA373] transition-colors leading-tight">
                          {item.speechTitle || 'Keynote Speech Presentation'}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-0.5">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            Evaluator: <strong className="text-slate-200">{item.evaluatorName || 'Speech Evaluator'}</strong>
                          </span>
                          {item.date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              {item.date}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-amber-300">
                            <Folder className="w-3.5 h-3.5 text-amber-400" />
                            {openedFolder}
                          </span>
                        </div>
                      </div>

                      {/* Snippet summary */}
                      {(item.commend1 || item.recommend) && (
                        <div className="p-3 rounded-xl bg-[#06111F] border border-[#BFA373]/30/80 text-xs text-slate-300 space-y-1.5">
                          {item.commend1 && (
                            <p className="line-clamp-2">
                              <strong className="text-emerald-400">Commend:</strong> {item.commend1}
                            </p>
                          )}
                          {item.recommend && (
                            <p className="line-clamp-2">
                              <strong className="text-amber-400">Recommend:</strong> {item.recommend}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Bottom CTA */}
                    <div className="flex items-center justify-end pt-3 border-t border-[#BFA373]/30 text-xs">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-cinzel font-bold text-[#BFA373] group-hover:translate-x-0.5 transition-transform"
                      >
                        <span>VIEW EVALUATION</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* 2. Time Steward Timing Cards */}
              {currentFolderData?.timings.map((rec) => {
                return (
                  <div
                    key={rec.id}
                    onClick={() => setSelectedTimingRecord(rec)}
                    className="group relative overflow-hidden rounded-2xl bg-[#06111F] border border-[#BFA373]/30 hover:border-[#BFA373] p-5 shadow-lg hover:shadow-2xl hover:shadow-[#BFA373]/10 transition-all cursor-pointer flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Card Top Pill - matching FEEDBACKER SUGGESTION style and color */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#06111F] border border-[#BFA373]/30 text-[#BFA373] text-[11px] font-bold font-cinzel tracking-wider">
                          <Timer className="w-3.5 h-3.5 text-[#BFA373]" />
                          <span>TIME STEWARD RECORD</span>
                        </div>
                      </div>

                      {/* Time Duration & Info */}
                      <div className="space-y-2">
                        {/* Monospace Stopwatch Time Pill & Compliance Tag */}
                        <div className="pt-1 pb-1 flex flex-wrap items-center gap-2">
                          <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#06111F] border border-[#BFA373]/30">
                            <Clock className="w-4 h-4 text-[#BFA373]" />
                            <span className="text-xs text-slate-400">Total Duration:</span>
                            <span className="font-mono text-xl sm:text-2xl font-black text-emerald-400 tracking-wider">
                              {rec.formattedTime}
                            </span>
                          </div>

                          {getRecordDurationSeconds(rec) < 180 ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs font-bold">
                              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                              <span>you must improve the speech timing in greater 3 min</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>keep it up</span>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            Timekeeper: <strong className="text-slate-200">{rec.timeStewardName || 'Time Steward'}</strong>
                          </span>
                          {rec.date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              {rec.date}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-amber-300">
                            <Folder className="w-3.5 h-3.5 text-amber-400" />
                            {openedFolder}
                          </span>
                        </div>
                      </div>

                      {/* Notes snippet if present */}
                      {rec.notes && (
                        <div className="p-2.5 rounded-xl bg-[#06111F] border border-[#BFA373]/30/80 text-xs text-slate-300">
                          <strong className="text-[#BFA373]">Notes:</strong> {rec.notes}
                        </div>
                      )}
                    </div>

                      {/* Card Bottom CTA */}
                    <div className="flex items-center justify-end pt-3 border-t border-[#BFA373]/30 text-xs">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-cinzel font-bold text-[#BFA373] group-hover:translate-x-0.5 transition-transform"
                      >
                        <span>VIEW TIMING REPORT</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* 3. Filler Counter Records */}
              {currentFolderData?.fillers.map((rec) => {
                return (
                  <div
                    key={rec.id}
                    onClick={() => setSelectedFillerRecord(rec)}
                    className="group relative overflow-hidden rounded-2xl bg-[#06111F] border border-[#BFA373]/30 hover:border-[#BFA373] p-5 shadow-lg hover:shadow-2xl hover:shadow-[#BFA373]/10 transition-all cursor-pointer flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Card Top Pill */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#06111F] border border-[#BFA373]/30 text-teal-300 text-[11px] font-bold font-cinzel tracking-wider">
                          <Filter className="w-3.5 h-3.5 text-teal-400" />
                          <span>FILLER COUNTER RECORD</span>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            rec.summaryRating === 'Excellent'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : rec.summaryRating === 'Okay'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {rec.summaryRating}
                        </span>
                      </div>

                      {/* Total Fillers & Info */}
                      <div className="space-y-2">
                        <div className="pt-1 pb-1 flex flex-wrap items-center gap-2">
                          <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#06111F] border border-[#BFA373]/30">
                            <span className="text-xs text-slate-400">Total Fillers:</span>
                            <span className="font-mono text-xl sm:text-2xl font-black text-teal-400">
                              {rec.totalFillers}
                            </span>
                          </div>

                          {/* Quick breakdown preview chips */}
                          <div className="flex flex-wrap gap-1 text-[10px] font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-[#06111F] text-amber-300 border border-[#BFA373]/30">
                              Ah: {rec.counts.ah}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-[#06111F] text-orange-300 border border-[#BFA373]/30">
                              Um: {rec.counts.um}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-[#06111F] text-teal-300 border border-[#BFA373]/30">
                              Well: {rec.counts.well}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-[#06111F] text-sky-300 border border-[#BFA373]/30">
                              So: {rec.counts.so}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-[#06111F] text-emerald-300 border border-[#BFA373]/30">
                              Rep: {rec.counts.repeats}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            Counter: <strong className="text-slate-200">{rec.fillerCounterName || 'Filler Counter'}</strong>
                          </span>
                          {rec.date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              {rec.date} {rec.time ? `• ${rec.time}` : ''}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-amber-300">
                            <Folder className="w-3.5 h-3.5 text-amber-400" />
                            {openedFolder}
                          </span>
                        </div>
                      </div>

                      {/* Notes snippet if present */}
                      {rec.notes && (
                        <div className="p-2.5 rounded-xl bg-[#06111F] border border-[#BFA373]/30/80 text-xs text-slate-300">
                          <strong className="text-[#BFA373]">Notes:</strong> {rec.notes}
                        </div>
                      )}
                    </div>

                    {/* Card Bottom CTA */}
                    <div className="flex items-center justify-end pt-3 border-t border-[#BFA373]/30 text-xs">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-cinzel font-bold text-[#BFA373] group-hover:translate-x-0.5 transition-transform"
                      >
                        <span>VIEW FILLER REPORT</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* MEETING FOLDERS DIRECTORY VIEW                                            */
          /* ========================================================================= */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Folder className="w-5 h-5 text-[#BFA373]" />
                <h3 className="font-cinzel text-lg sm:text-xl font-bold text-white tracking-wide">
                  Meeting Folders
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                {meetingFolders.length === 1 ? '1 meeting folder' : `${meetingFolders.length} meeting folders`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {meetingFolders.map((folder) => {
                return (
                  <div
                    key={folder.folderName}
                    onClick={() => setOpenedFolder(folder.folderName)}
                    className="group relative overflow-hidden rounded-2xl bg-[#06111F] border border-[#BFA373]/30 hover:border-[#BFA373] p-5 shadow-xl hover:shadow-2xl hover:shadow-[#BFA373]/15 transition-all cursor-pointer flex flex-col justify-between space-y-4 hover:-translate-y-0.5"
                  >
                    <div className="space-y-3.5">
                      {/* Folder Top Row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#BFA373] group-hover:bg-[#BFA373] group-hover:text-[#06111F] transition-colors shadow-inner">
                          <Folder className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-[#06111F] text-[#BFA373] border border-[#BFA373]/30">
                            {folder.totalCount} {folder.totalCount === 1 ? 'Record' : 'Records'}
                          </span>
                        </div>
                      </div>

                      {/* Folder Name & Info */}
                      <div className="space-y-1.5">
                        <h4 className="font-cinzel text-lg font-bold text-white group-hover:text-[#BFA373] transition-colors">
                          {folder.folderName}
                        </h4>

                        {/* Badges showing what's inside */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {folder.evaluations.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-500/30">
                              <FileCheck className="w-3 h-3 text-amber-400" />
                              {folder.evaluations.length} {folder.evaluations.length === 1 ? 'Feedback' : 'Feedbacks'}
                            </span>
                          )}
                          {folder.timings.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-300 bg-orange-950/40 px-2 py-0.5 rounded-md border border-orange-500/30">
                              <Timer className="w-3 h-3 text-orange-400" />
                              {folder.timings.length} {folder.timings.length === 1 ? 'Timing' : 'Timings'}
                            </span>
                          )}
                          {folder.fillers.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-300 bg-teal-950/40 px-2 py-0.5 rounded-md border border-teal-500/30">
                              <Filter className="w-3 h-3 text-teal-400" />
                              {folder.fillers.length} {folder.fillers.length === 1 ? 'Filler Report' : 'Filler Reports'}
                            </span>
                          )}
                        </div>

                        {folder.speechTitles.length > 0 && (
                          <p className="text-xs text-slate-400 line-clamp-1 pt-1">
                            Speech: <span className="text-slate-200">{folder.speechTitles[0]}</span>
                          </p>
                        )}

                        {folder.evaluators.length > 0 && (
                          <p className="text-[11px] text-slate-500">
                            Feedbacker: {folder.evaluators.join(', ')}
                          </p>
                        )}
                        {folder.timeStewards.length > 0 && (
                          <p className="text-[11px] text-slate-500">
                            Time Steward: {folder.timeStewards.join(', ')}
                          </p>
                        )}
                        {folder.latestDate && (
                          <p className="text-[10px] text-slate-500">
                            Date: {folder.latestDate}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Folder Footer Button */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#BFA373]/30 text-xs">
                      <span className="text-[11px] text-slate-400">
                        Click to open folder
                      </span>
                      <div className="inline-flex items-center gap-1 font-cinzel font-bold text-[#BFA373] group-hover:translate-x-1 transition-transform">
                        <span>OPEN FOLDER</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* READ-ONLY SPEECH EVALUATION SHEET MODAL (EDIT NOT ALLOWED)               */}
      {/* ========================================================================= */}
      {selectedEvaluation && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-[#06111F] border border-[#BFA373]/30 rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Top Bar */}
            <div className="p-4 sm:p-5 border-b border-[#BFA373]/30 flex items-center justify-between bg-[#06111F] shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[#BFA373]">
                  <FileCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-cinzel font-bold text-white text-base sm:text-lg">
                    Feedbacker Suggestion
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Prepared by: <strong className="text-white">{selectedEvaluation.evaluatorName}</strong> &bull; Date: {selectedEvaluation.date}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isDownloadingPdf}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  title="Download Evaluation as PDF"
                >
                  {isDownloadingPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>PDF...</span>
                    </>
                  ) : (
                    <>
                      <FileDown className="w-3.5 h-3.5 text-white" />
                      <span>PDF</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedEvaluation(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: The Authentic Golden-Black Evaluation Sheet */}
            <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-6 bg-[#06111F]">
              <div
                ref={sheetModalRef}
                className="w-full bg-[#06111F] text-slate-100 border-2 border-[#BFA373]/50 shadow-2xl rounded-2xl p-4 sm:p-6 lg:p-8 font-sans space-y-5"
              >
                {/* Header Crest Info */}
                <div className="border-b border-[#BFA373]/30 pb-4 text-center space-y-1">
                  <h3 className="font-cinzel text-lg sm:text-xl font-bold text-[#BFA373] tracking-wider uppercase">
                    The Declamate&apos;s Society &bull; Evaluation Sheet
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">
                    {selectedEvaluation.clubName || 'Sri Amaraavathi College of Arts & Science, Karur'} &bull; Area {selectedEvaluation.areaNumber || '9'}
                  </p>
                </div>

                {/* Speaker & Speech Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#06111F] border border-[#BFA373]/30 rounded-xl text-xs">
                  <div>
                    <span className="block text-[#BFA373] font-bold uppercase text-[10px] tracking-wider font-cinzel">
                      Speaker Name:
                    </span>
                    <span className="font-semibold text-white text-sm">
                      {selectedEvaluation.speakerName || 'Speaker'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[#BFA373] font-bold uppercase text-[10px] tracking-wider font-cinzel">
                      Speech Title:
                    </span>
                    <span className="font-semibold text-white text-sm">
                      {selectedEvaluation.speechTitle || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[#BFA373] font-bold uppercase text-[10px] tracking-wider font-cinzel">
                      Meeting Number:
                    </span>
                    <span className="font-semibold text-white text-sm flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-amber-400" />
                      {selectedEvaluation.meetingNumber || selectedEvaluation.speechTime || '1st Meeting'}
                    </span>
                  </div>
                </div>

                {/* 18 Categories Evaluation Table (Read-Only) */}
                <div className="space-y-2">
                  <h4 className="font-cinzel text-xs font-bold uppercase tracking-wider text-[#BFA373]">
                    1. Detailed Evaluation Matrix (18 Categories)
                  </h4>
                  <div className="border border-[#BFA373]/30 rounded-xl overflow-hidden shadow-inner">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#06111F] text-slate-300 border-b border-[#BFA373]/30">
                            <th className="p-2.5 sm:p-3 font-cinzel font-bold text-white min-w-[200px]">
                              Categories
                            </th>
                            {RATING_COLUMNS.map((col) => (
                              <th
                                key={col}
                                className="p-2 sm:p-2.5 text-center font-bold text-[10px] sm:text-xs tracking-wider uppercase text-[#BFA373] border-l border-[#BFA373]/30 min-w-[90px]"
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#BFA373]/30/60 bg-[#06111F]">
                          {EVALUATION_CATEGORIES.map((cat, idx) => {
                            const currentRating = selectedEvaluation.ratings?.[cat.id];
                            return (
                              <tr
                                key={cat.id}
                                className={idx % 2 === 0 ? 'bg-[#06111F]' : 'bg-[#06111F]'}
                              >
                                <td className="p-2.5 sm:p-3">
                                  <div className="font-bold text-white text-xs">{cat.title}</div>
                                  <div className="text-[11px] text-slate-400">{cat.desc}</div>
                                </td>
                                {RATING_COLUMNS.map((col) => {
                                  const isSelected = currentRating === col;
                                  return (
                                    <td
                                      key={col}
                                      className="p-1.5 sm:p-2 text-center border-l border-[#BFA373]/30/60"
                                    >
                                      {isSelected ? (
                                        <span className="inline-flex items-center justify-center px-2 py-1 rounded-md text-[10px] font-bold bg-[#BFA373] text-[#06111F] shadow-md shadow-amber-500/20">
                                          &bull; Rated &bull;
                                        </span>
                                      ) : (
                                        <span className="inline-block w-2 h-2 rounded-full bg-slate-800" />
                                      )}
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
                </div>

                {/* Structured Qualitative Feedback (Read-Only) */}
                <div className="space-y-4 pt-2">
                  <h4 className="font-cinzel text-xs font-bold uppercase tracking-wider text-[#BFA373]">
                    Feedback &amp; Action Plan (Suggestions)
                  </h4>

                  {/* 2. Commend */}
                  <div className="p-4 rounded-xl bg-[#06111F] border border-[#BFA373]/30 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-cinzel">
                      2. Commend (What was done well)
                    </span>
                    <p className="text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {selectedEvaluation.commend1 || 'None specified.'}
                    </p>
                  </div>

                  {/* 3. Recommend */}
                  <div className="p-4 rounded-xl bg-[#06111F] border border-[#BFA373]/30 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 font-cinzel">
                      3. Recommend (Suggestions for improvement)
                    </span>
                    <p className="text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {selectedEvaluation.recommend || 'None specified.'}
                    </p>
                  </div>

                  {/* 4. Commend */}
                  <div className="p-4 rounded-xl bg-[#06111F] border border-[#BFA373]/30 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-cinzel">
                      4. Commend (What to keep doing / continue)
                    </span>
                    <p className="text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {selectedEvaluation.commend2 || 'None specified.'}
                    </p>
                  </div>

                  {/* 5. Action Plan */}
                  <div className="p-4 rounded-xl bg-[#06111F] border border-[#BFA373]/30 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 font-cinzel">
                      5. Action Plan (Key action for your next speech)
                    </span>
                    <p className="text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {selectedEvaluation.actionPlan || 'None specified.'}
                    </p>
                  </div>

                  {/* 6. Overall Evaluation */}
                  <div className="p-4 rounded-xl bg-[#06111F] border border-[#BFA373]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#BFA373] font-cinzel">
                      6. Overall Speech Evaluation Rating:
                    </span>
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border ${getRatingBadgeStyle(
                        selectedEvaluation.overallEvaluation
                      )}`}
                    >
                      {selectedEvaluation.overallEvaluation || 'Satisfactory'}
                    </span>
                  </div>

                  {/* Signature block */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#BFA373]/30 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                        Evaluator Signature:
                      </span>
                      <span className="font-cinzel text-white font-bold text-sm">
                        {selectedEvaluation.evaluatorName || 'Speech Evaluator'}
                      </span>
                    </div>
                    <div className="sm:text-right">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                        Evaluation Date:
                      </span>
                      <span className="text-slate-200 font-mono text-sm">
                        {selectedEvaluation.date || 'Recorded'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#BFA373]/30 flex items-center justify-between bg-[#06111F] shrink-0">
              <span className="text-xs text-slate-400 hidden sm:inline">
                Evaluation sheet stored in your personal Activity tab.
              </span>
              <button
                type="button"
                onClick={() => setSelectedEvaluation(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer ml-auto"
              >
                Close Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TIME STEWARD TIMING REPORT MODAL                                          */}
      {/* ========================================================================= */}
      {selectedTimingRecord && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-[#06111F] border border-[#BFA373]/30 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Top Bar */}
            <div className="p-4 sm:p-5 border-b border-[#BFA373]/30 flex items-center justify-between bg-[#06111F] shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400">
                  <Timer className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-cinzel font-bold text-white text-base sm:text-lg">
                    Official Speech Timing Report
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Recorded by Time Steward &bull; <strong className="text-white">{selectedTimingRecord.timeStewardName}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTimingRecord(null)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
              {/* Speaker & Meeting Meta Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[#06111F] border border-[#BFA373]/30 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                    Keynote Speaker:
                  </span>
                  <span className="font-cinzel text-white font-bold text-sm sm:text-base">
                    {selectedTimingRecord.speakerName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                    Meeting Number / Folder:
                  </span>
                  <span className="font-cinzel text-amber-300 font-bold text-sm sm:text-base flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-amber-400" />
                    {selectedTimingRecord.meetingNumber || '1st Meeting'}
                  </span>
                </div>
                {selectedTimingRecord.speechTitle ? (
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Speech Title:
                    </span>
                    <span className="text-slate-200 font-semibold text-xs sm:text-sm">
                      {selectedTimingRecord.speechTitle}
                    </span>
                  </div>
                ) : null}
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                    Date Recorded:
                  </span>
                  <span className="text-slate-200 font-mono text-xs sm:text-sm">
                    {selectedTimingRecord.date || 'Today'}
                  </span>
                </div>
              </div>

              {/* Big Duration & Signal Spotlight Card */}
              <div className="p-6 rounded-2xl bg-radial from-orange-950/20 via-[#06111F] to-[#06111F] border border-orange-500/30 text-center space-y-3">
                <span className="text-xs uppercase font-bold tracking-widest text-slate-400 font-cinzel">
                  Official Speech Duration
                </span>

                <div className="font-mono text-4xl sm:text-6xl font-black text-emerald-400 tracking-wider">
                  {selectedTimingRecord.formattedTime}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  {getRecordDurationSeconds(selectedTimingRecord) < 180 ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border bg-red-500/20 text-red-300 border-red-500/40 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                      <span>Under Minimum 3 Mins</span>
                    </span>
                  ) : (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                        selectedTimingRecord.status === 'green'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : selectedTimingRecord.status === 'amber'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : selectedTimingRecord.status === 'red'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {selectedTimingRecord.status === 'green'
                        ? 'Green Signal Achieved'
                        : selectedTimingRecord.status === 'amber'
                        ? 'Amber Signal Achieved'
                        : selectedTimingRecord.status === 'red'
                        ? 'Red Signal (Max Time)'
                        : 'Qualified Timing (3+ Mins)'}
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-full text-xs font-mono bg-[#06111F] text-slate-300 border border-[#BFA373]/30">
                    {getRecordDurationSeconds(selectedTimingRecord)} Seconds
                  </span>
                </div>
              </div>

              {/* Notes from Time Steward */}
              {selectedTimingRecord.notes && (
                <div className="p-4 rounded-xl bg-[#06111F] border border-[#BFA373]/30 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400 font-cinzel">
                    Time Steward Remarks:
                  </span>
                  <p className="text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {selectedTimingRecord.notes}
                  </p>
                </div>
              )}

              {/* Keynote Speech Timing Compliance Box (Compulsory 3-Minute Rule) */}
              {getRecordDurationSeconds(selectedTimingRecord) < 180 ? (
                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/50 flex items-center justify-between gap-3 text-xs text-red-300 animate-in fade-in shadow-lg shadow-red-950/30">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                    <div>
                      <span className="font-bold block text-red-200 text-sm">
                        you must improve the speech timing in greater 3 min
                      </span>
                      <span className="text-[11px] text-red-300/80">
                        Verified Timekeeper Record &bull; Compulsory requirement: Keynote speeches must be at least 3 minutes
                      </span>
                    </div>
                  </div>
                  <span className="font-cinzel font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md bg-red-500/20 text-red-300 border border-red-500/40 shrink-0 hidden sm:inline-block">
                    Improve Timing
                  </span>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-950/25 border border-emerald-500/40 flex items-center justify-between gap-3 text-xs text-emerald-300 animate-in fade-in shadow-lg shadow-emerald-950/20">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold block text-emerald-200 text-sm">
                        keep it up
                      </span>
                      <span className="text-[11px] text-emerald-300/80">
                        Verified Timekeeper Record &bull; Successfully saved in speaker folder
                      </span>
                    </div>
                  </div>
                  <span className="font-cinzel font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0 hidden sm:inline-block">
                    Qualified
                  </span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#BFA373]/30 flex items-center justify-between bg-[#06111F] shrink-0">
              <span className="text-xs text-slate-400 hidden sm:inline">
                Synchronized under meeting folder &ldquo;{selectedTimingRecord.meetingNumber || '1st Meeting'}&rdquo;
              </span>
              <button
                type="button"
                onClick={() => setSelectedTimingRecord(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer ml-auto"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FILLER COUNTER RECORD MODAL (Comprehensive Ah-Counter Speech Log)         */}
      {/* ========================================================================= */}
      {selectedFillerRecord && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#06111F] border border-[#BFA373]/30 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Top Header */}
            <div className="p-4 sm:p-5 border-b border-[#BFA373]/30 flex items-center justify-between bg-[#06111F] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <Filter className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-cinzel text-base sm:text-lg font-bold text-white tracking-wide">
                      FILLER COUNTER REPORT
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-teal-500/20 text-teal-300 border border-teal-500/40">
                      Official
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    The Declamate&apos;s Society &bull; {selectedFillerRecord.meetingNumber || '1st Meeting'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedFillerRecord(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {/* Speaker Metadata Bar */}
              <div className="p-3.5 rounded-xl bg-[#06111F] border border-[#BFA373]/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-cinzel">Speaker</span>
                  <strong className="text-white text-xs sm:text-sm font-semibold truncate block">
                    {selectedFillerRecord.speakerName}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-cinzel">Meeting Folder</span>
                  <strong className="text-amber-300 font-cinzel text-xs sm:text-sm block">
                    {selectedFillerRecord.meetingNumber || '1st Meeting'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-cinzel">Date & Time</span>
                  <span className="text-slate-300 block text-xs truncate">
                    {selectedFillerRecord.date} {selectedFillerRecord.time ? `• ${selectedFillerRecord.time}` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-cinzel">Filler Counter</span>
                  <strong className="text-slate-200 block text-xs truncate">
                    {selectedFillerRecord.fillerCounterName}
                  </strong>
                </div>
              </div>

              {/* Total Fillers & Overall Assessment Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-[#06111F] to-[#06111F] border border-[#BFA373]/30 text-center space-y-2">
                <span className="text-xs uppercase font-cinzel font-bold text-slate-400 tracking-wider">
                  Total Fillers Recorded
                </span>
                <div className="font-mono text-4xl sm:text-6xl font-black text-teal-400 tracking-wider">
                  {selectedFillerRecord.totalFillers}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                      selectedFillerRecord.summaryRating === 'Excellent'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : selectedFillerRecord.summaryRating === 'Okay'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    Assessment: {selectedFillerRecord.summaryRating}
                  </span>
                </div>
              </div>

              {/* Detailed Breakdown Grid */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase font-cinzel tracking-wider text-[#BFA373] block">
                  Category Breakdown:
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-3 rounded-xl bg-[#06111F] border border-[#BFA373]/30">
                    <span className="text-[10px] text-amber-300 font-mono block">AH</span>
                    <strong className="font-mono text-lg text-white">{selectedFillerRecord.counts.ah}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-[#06111F] border border-[#BFA373]/30">
                    <span className="text-[10px] text-orange-300 font-mono block">UM / UHH</span>
                    <strong className="font-mono text-lg text-white">{selectedFillerRecord.counts.um}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-[#06111F] border border-[#BFA373]/30">
                    <span className="text-[10px] text-rose-300 font-mono block">ER</span>
                    <strong className="font-mono text-lg text-white">{selectedFillerRecord.counts.er}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-[#06111F] border border-[#BFA373]/30">
                    <span className="text-[10px] text-teal-300 font-mono block">WELL</span>
                    <strong className="font-mono text-lg text-white">{selectedFillerRecord.counts.well}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-[#06111F] border border-[#BFA373]/30">
                    <span className="text-[10px] text-sky-300 font-mono block">SO</span>
                    <strong className="font-mono text-lg text-white">{selectedFillerRecord.counts.so}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-[#06111F] border border-[#BFA373]/30">
                    <span className="text-[10px] text-purple-300 font-mono block">LIKE</span>
                    <strong className="font-mono text-lg text-white">{selectedFillerRecord.counts.like}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-[#06111F] border border-[#BFA373]/30">
                    <span className="text-[10px] text-indigo-300 font-mono block">BUT</span>
                    <strong className="font-mono text-lg text-white">{selectedFillerRecord.counts.but}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-[#06111F] border border-[#BFA373]/30">
                    <span className="text-[10px] text-emerald-300 font-mono block">REPEATS</span>
                    <strong className="font-mono text-lg text-white">{selectedFillerRecord.counts.repeats}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-[#06111F] border border-[#BFA373]/30">
                    <span className="text-[10px] text-cyan-300 font-mono block">OTHER</span>
                    <strong className="font-mono text-lg text-white">{selectedFillerRecord.counts.other}</strong>
                  </div>
                </div>
              </div>

              {/* Other Details if present */}
              {selectedFillerRecord.otherDetails && (
                <div className="p-3 rounded-xl bg-[#06111F] border border-[#BFA373]/30 text-xs">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase font-cinzel">
                    Other Specific Words Noted:
                  </span>
                  <p className="text-slate-200 mt-0.5">{selectedFillerRecord.otherDetails}</p>
                </div>
              )}

              {/* Notes from Filler Counter */}
              {selectedFillerRecord.notes && (
                <div className="p-4 rounded-xl bg-[#06111F] border border-[#BFA373]/30 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 font-cinzel">
                    Filler Counter Remarks &bull; Notes:
                  </span>
                  <p className="text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {selectedFillerRecord.notes}
                  </p>
                </div>
              )}

              {/* Club Quotes & Motto */}
              <div className="p-3.5 rounded-xl bg-[#06111F] border border-[#BFA373]/30 text-center space-y-1">
                <p className="text-xs text-slate-300 italic font-serif">
                  &ldquo;Silence is powerful. Pause with purpose, not fillers.&rdquo;
                </p>
                <p className="text-[10px] text-[#BFA373] font-cinzel font-bold tracking-widest uppercase pt-1">
                  FEWER FILLERS. GREATER IMPACT.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#BFA373]/30 flex items-center justify-between bg-[#06111F] shrink-0">
              <span className="text-xs text-slate-400 hidden sm:inline">
                Synchronized under meeting folder &ldquo;{selectedFillerRecord.meetingNumber || '1st Meeting'}&rdquo;
              </span>
              <button
                type="button"
                onClick={() => setSelectedFillerRecord(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer ml-auto"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
