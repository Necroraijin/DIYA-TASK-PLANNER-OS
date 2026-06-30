export interface Task {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Todo' | 'In Progress' | 'Done';
  deadline: string; // YYYY-MM-DD format
  userId?: string;
  
  // AI-Assisted fields
  cognitivePriority?: string;
  consequencesOfMissing?: string;
  readyToGoSolutions?: string[];
  alternativePlans?: string[];
  copilotAssistance?: string;
}

export interface Habit {
  id: string;
  title: string;
  category: string;
  completedDays: string[]; // List of YYYY-MM-DD strings
  streak: number;
  userId?: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  read: boolean;
  timestamp: string;
  userId?: string;
}

export interface AppUser {
  uid?: string;
  username: string;
  email: string;
  encryptionKey: string;
  avatarUrl: string;
}

export interface IntegrationState {
  googleCalendarSynced: boolean;
  gmailSynced: boolean;
  outlookSynced: boolean;
  syncedEventsCount: number;
  syncedEmailsCount: number;
}
