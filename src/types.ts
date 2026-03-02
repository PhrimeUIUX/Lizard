export type Nullable<T> = T | null;

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  presses: number;
}

export interface PressResponse {
  ok: boolean;
  public_total?: number;
  user_total?: number;
  error?: string;
}

export type NoticeTone = 'success' | 'error' | 'info';
