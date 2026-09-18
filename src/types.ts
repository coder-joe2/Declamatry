export type ExecutiveCommitteeRole =
  | 'President'
  | 'Director of Learning'
  | 'Director of Membership'
  | 'Secretary'
  | 'Financial Officer'
  | 'Operations Officer'
  | '';

export type SpeakerHonorRole =
  | 'Key Note Speakers'
  | 'Role Players'
  | 'Evaluators'
  | 'Quick Think Speaker'
  | 'Filter Counter'
  | 'Filler Counter'
  | 'Time Steward'
  | 'Best Role Players'
  | 'Best Evaluators'
  | 'Best Quick Think Speaker'
  | '';

export interface UserProfile {
  id?: string;
  name: string;
  gmail: string;
  phone: string;
  year?: string;
  department: string;
  className?: string;
  photoUrl: string;
  isAdmin?: boolean;
  isRoleEntry?: boolean;
  password?: string;
  executiveRole?: ExecutiveCommitteeRole | string;
  speakerRole?: SpeakerHonorRole | string;
  speakerRoles?: string[];
}

export interface RegisteredMember extends UserProfile {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  executiveRole?: ExecutiveCommitteeRole | string;
  speakerRole?: SpeakerHonorRole | string;
  speakerRoles?: string[];
}

export function isUserAdmin(profile?: Partial<UserProfile> | null): boolean {
  if (!profile) return false;
  const email = (profile.gmail || '').trim().toLowerCase();
  const name = (profile.name || '').trim().toLowerCase();
  // Strictly only the designated master Admin account qualifies as Admin
  return (
    email === 'admin' ||
    email === 'admin@declamate.com' ||
    name === 'admin' ||
    name === 'administrator'
  );
}

export function isUserRoleEntry(profile?: Partial<UserProfile> | null): boolean {
  if (!profile) return false;
  const email = (profile.gmail || '').trim().toLowerCase();
  const name = (profile.name || '').trim().toLowerCase();
  // Strictly only the designated Role Entry account qualifies for Speaker Roles bar
  return (
    email === 'role entry' ||
    email === 'roleentry' ||
    email === 'role entry coordinator' ||
    email === 'roleentry@declamate.com' ||
    name === 'role entry' ||
    name === 'role entry coordinator'
  );
}

export const EXECUTIVE_ROLES_LIST = [
  { id: 'President', label: 'President', short: 'PRES', desc: 'Leads club sessions, presides over meetings, and represents the society.' },
  { id: 'Director of Learning', label: 'Director of Learning', short: 'LEARN', desc: 'Plans speech agendas, training pathways, and evaluation sessions.' },
  { id: 'Director of Membership', label: 'Director of Membership', short: 'MEMB', desc: 'Welcomes new members, manages onboarding, and tracks attendance.' },
  { id: 'Secretary', label: 'Secretary', short: 'SEC', desc: 'Maintains meeting records, circulars, and official minutes.' },
  { id: 'Financial Officer', label: 'Financial Officer', short: 'FIN', desc: 'Oversees club funds, budget planning, and event expenditures.' },
  { id: 'Operations Officer', label: 'Operations Officer', short: 'OPS', desc: 'Manages meeting hall logistics, stage setup, and technical equipment.' },
] as const;

export interface SpeakerRoleItem {
  id: SpeakerHonorRole;
  label: string;
  short: string;
  maxMembers?: number; // undefined means unlimited ("ethana peru vena add pannala")
  desc: string;
}

export const SPEAKER_ROLES_LIST: readonly SpeakerRoleItem[] = [
  {
    id: 'Key Note Speakers',
    label: 'Key Note Speakers',
    short: 'KEYNOTE',
    desc: 'Delivers the featured keynote speeches and prepared presentations.',
  },
  {
    id: 'Role Players',
    label: 'Role Players',
    short: 'ROLE',
    desc: 'Distinguished meeting role performers.',
  },
  {
    id: 'Evaluators',
    label: 'Evaluators (Feedbacker)',
    short: 'EVAL',
    desc: 'Provides constructive evaluations and feedback for speakers. The appointed feedbacker unlocks the Speech Evaluator Page in their sidebar.',
  },
  {
    id: 'Quick Think Speaker',
    label: 'Quick Think Speaker',
    short: 'QUICK',
    desc: 'Excelled in impromptu and table topics speaking.',
  },
  {
    id: 'Filter Counter',
    label: 'Filler Counter',
    short: 'FILLER',
    maxMembers: 1, // Only 1 member allowed
    desc: 'Notes and counts crutch/filler words, pauses, and repeated phrases during speeches. Appointed member unlocks the Filler Counter Page in their sidebar.',
  },
  {
    id: 'Time Steward',
    label: 'Time Steward',
    short: 'TIMER',
    maxMembers: 1, // Only 1 member allowed
    desc: 'Monitors speaking durations and operates meeting timing signals.',
  },
] as const;

export function formatSpeakerRole(role?: string): string {
  if (!role) return '';
  const trimmed = role.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower === 'best role players' ||
    lower === 'role players' ||
    lower === 'best role player' ||
    lower === 'role player'
  ) {
    return 'Role Player';
  }
  if (
    lower === 'key note speakers' ||
    lower === 'keynote speakers' ||
    lower === 'key note speaker' ||
    lower === 'keynote speaker'
  ) {
    return 'Key Note Speaker';
  }
  if (
    lower === 'best evaluators' ||
    lower === 'evaluators' ||
    lower === 'best evaluator' ||
    lower === 'evaluator' ||
    lower === 'feedbacker' ||
    lower === 'feedbackers' ||
    lower === 'feed backer' ||
    lower === 'feed backers' ||
    lower === 'speech evaluator' ||
    lower === 'evaluators (feedbacker)' ||
    lower === 'evaluator (feedbacker)'
  ) {
    return 'Evaluator (Feedbacker)';
  }
  if (
    lower === 'best quick think speaker' ||
    lower === 'quick think speaker' ||
    lower === 'quick think speakers'
  ) {
    return 'Quick Think Speaker';
  }
  if (
    lower === 'filter counter' ||
    lower === 'fillter counter' ||
    lower === 'filler counter' ||
    lower === 'filler' ||
    lower === 'ah counter' ||
    lower === 'ah-counter' ||
    lower === 'best filter counter' ||
    lower === 'best fillter counter' ||
    lower === 'best filler counter'
  ) {
    return 'Filler Counter';
  }
  if (
    lower === 'time steward' ||
    lower === 'timer' ||
    lower === 'timer steward' ||
    lower === 'best time steward'
  ) {
    return 'Time Steward';
  }
  return trimmed;
}

export type SidebarTab =
  | 'Home'
  | 'Activity'
  | 'About Club'
  | 'Leadership Roles'
  | 'Learning Tips'
  | 'Recommended Videos'
  | 'Leaderboard'
  | 'Levels'
  | 'Voting'
  | 'Profile'
  | 'Members List'
  | 'Admin Executive Committee Roles'
  | 'Admin Speaker Roles'
  | 'Speech Evaluator Page'
  | 'Time Steward'
  | 'Filler Counter Page';

export interface TimeStewardRecord {
  id?: string;
  speakerName: string;
  speakerEmail?: string;
  speakerRole?: string;
  speakerDepartment?: string;
  speechTitle?: string;
  meetingNumber: string;
  durationSeconds: number;
  formattedTime: string; // e.g. "05:42"
  timeStewardName: string;
  timeStewardEmail?: string;
  date: string;
  notes?: string;
  status?: 'green' | 'amber' | 'red' | 'normal';
  createdAt?: string;
  updatedAt?: string;
}

export type FillerSummaryRating = 'Excellent' | 'Okay' | 'Needs Improvement';

export interface FillerCounts {
  ah: number;
  um: number;
  er: number;
  well: number;
  so: number;
  like: number;
  but: number;
  repeats: number;
  other: number;
}

export interface FillerCounterRecord {
  id?: string;
  speakerName: string;
  speakerEmail?: string;
  speakerRole?: string;
  speakerDepartment?: string;
  meetingNumber: string; // e.g. "1st Meeting"
  date: string;
  time?: string;
  roleOrTitle?: string;
  counts: FillerCounts;
  totalFillers: number;
  otherDetails?: string; // e.g., "you know x2, actually x1"
  summaryRating: FillerSummaryRating;
  notes?: string;
  fillerCounterName: string;
  fillerCounterEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type EvaluationRatingLevel =
  | 'Excellent'
  | 'Above Average'
  | 'Satisfactory'
  | 'Should Improve'
  | 'Must Improve';

export interface SpeechEvaluationCategoryItem {
  id: number;
  title: string;
  desc: string;
}

export interface SpeechEvaluationSheetData {
  id?: string;
  clubName: string;
  areaNumber: string;
  speakerName: string;
  speakerEmail?: string;
  speakerRole?: string;
  speakerDepartment?: string;
  speechTitle: string;
  speechTime?: string;
  meetingNumber?: string;
  ratings: Record<number, EvaluationRatingLevel | ''>;
  commend1: string; // 2. COMMEND (What was done well)
  recommend: string; // 3. RECOMMEND (Suggestions for improvement)
  commend2: string; // 4. COMMEND (What to keep doing/continue)
  actionPlan: string; // 5. ACTION PLAN (One key action the speaker can take for the next speech)
  overallEvaluation: EvaluationRatingLevel | '';
  evaluatorName: string;
  evaluatorEmail: string;
  date: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RecommendedVideo {
  id: string;
  title: string;
  channelName: string;
  youtubeUrl: string;
  youtubeId: string;
  category: 'Communication Improvement' | 'Body Language' | 'Programming Skills' | 'Public Speaking';
  description: string;
  duration?: string;
  badge?: string;
  thumbnailUrl?: string;
  createdAt?: string;
}

export interface PollOption {
  id: string;
  text: string;
  photoUrl?: string;
  votes: number;
  voterEmails: string[];
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  allowMultipleAnswers?: boolean;
  category?: string;
  createdBy: {
    name: string;
    gmail: string;
    photoUrl?: string;
    department?: string;
  };
  createdAt: string;
  isActive: boolean;
  totalVotes: number;
  votedUserEmails: string[];
}

export interface MeetingCandidate {
  id: string;
  name: string;
  roleOrTopic?: string;
  photoUrl?: string;
  memberEmail?: string;
  department?: string;
  year?: string;
  votes: number;
  voterEmails: string[];
}

export interface MeetingVotingCategory {
  id: string;
  title: string;
  subtitle?: string;
  iconName?: string;
  candidates: MeetingCandidate[];
}

export interface MeetingVotingSession {
  id: string;
  title: string;
  meetingNumber?: string;
  meetingDate: string;
  categories: MeetingVotingCategory[];
  isActive: boolean;
  createdAt: string;
  createdBy: {
    name: string;
    gmail: string;
    photoUrl?: string;
  };
  totalVoters: number;
  votedUserEmails: string[];
}

export interface AppMessage {
  id: string;
  type: 'role_appointed' | 'new_poll' | 'general' | 'poll_created' | 'role_assigned';
  title: string;
  message: string;
  targetEmail: string; // 'public' for all members including admin, or specific email (e.g. member's gmail)
  isBroadcast?: boolean;
  roleName?: string;
  createdAt: string;
  createdBy?: {
    name: string;
    gmail?: string;
    photoUrl?: string;
  };
  readBy?: string[]; // Array of emails who read the message
  deletedBy?: string[]; // Array of emails who deleted/dismissed the message
}
