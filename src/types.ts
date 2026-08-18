export interface UserProfile {
  name: string;
  gmail: string;
  phone: string;
  year?: string;
  department: string;
  photoUrl: string;
  isAdmin?: boolean;
}

export type SidebarTab =
  | 'Home'
  | 'About Club'
  | 'Learning Tips'
  | 'Leaderboard'
  | 'Levels'
  | 'Voting'
  | 'Profile';

export interface PollOption {
  id: string;
  text: string;
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
