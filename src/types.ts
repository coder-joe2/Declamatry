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
  | 'Best Role Players'
  | 'Best Evaluators'
  | 'Best Quick Think Speaker'
  | '';

export interface UserProfile {
  name: string;
  gmail: string;
  phone: string;
  year?: string;
  department: string;
  className?: string;
  photoUrl: string;
  isAdmin?: boolean;
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

export const EXECUTIVE_ROLES_LIST = [
  { id: 'President', label: 'President', short: 'PRES', desc: 'Leads club sessions, presides over meetings, and represents the society.' },
  { id: 'Director of Learning', label: 'Director of Learning', short: 'LEARN', desc: 'Plans speech agendas, training pathways, and evaluation sessions.' },
  { id: 'Director of Membership', label: 'Director of Membership', short: 'MEMB', desc: 'Welcomes new members, manages onboarding, and tracks attendance.' },
  { id: 'Secretary', label: 'Secretary', short: 'SEC', desc: 'Maintains meeting records, circulars, and official minutes.' },
  { id: 'Financial Officer', label: 'Financial Officer', short: 'FIN', desc: 'Oversees club funds, budget planning, and event expenditures.' },
  { id: 'Operations Officer', label: 'Operations Officer', short: 'OPS', desc: 'Manages meeting hall logistics, stage setup, and technical equipment.' },
] as const;

export const SPEAKER_ROLES_LIST = [
  { id: 'Key Note Speakers', label: 'Key Note Speakers', short: 'KEYNOTE' },
  { id: 'Best Role Players', label: 'Best Role Players', short: 'ROLE' },
  { id: 'Best Evaluators', label: 'Best Evaluators', short: 'EVAL' },
  { id: 'Best Quick Think Speaker', label: 'Best Quick Think Speaker', short: 'QUICK' },
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
    lower === 'evaluator'
  ) {
    return 'Evaluator';
  }
  if (
    lower === 'best quick think speaker' ||
    lower === 'quick think speaker' ||
    lower === 'quick think speakers'
  ) {
    return 'Quick Think Speaker';
  }
  return trimmed;
}

export type SidebarTab =
  | 'Home'
  | 'About Club'
  | 'Leadership Roles'
  | 'Learning Tips'
  | 'Leaderboard'
  | 'Levels'
  | 'Voting'
  | 'Profile'
  | 'Members List'
  | 'Admin Executive Committee Roles'
  | 'Admin Speaker Roles';

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
  type: 'role_appointed' | 'new_poll' | 'general';
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
}
