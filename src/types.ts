export interface User {
  id: number;
  email: string;
  name?: string;
  username?: string;
}

export type LogStatus = "Period" | "Pill" | "Free";

export interface CycleLog {
  id: number;
  date: string; // ISO string
  status: LogStatus;
  time: string; // e.g. "09:30 AM"
  description: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
