export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type EntryStatus = "pending" | "published" | "rejected";
export type FeedKind =
  | "rss"
  | "atom"
  | "api"
  | "hacker_news"
  | "reddit"
  | "hugging_face"
  | "arxiv";
export type CronRunStatus = "running" | "succeeded" | "partial" | "failed";

export interface EntryRow {
  id: string;
  title: string;
  source_name: string;
  original_url: string;
  source_excerpt: string | null;
  feed_kind: FeedKind;
  published_at: string | null;
  status: EntryStatus;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EntryInsert {
  id?: string;
  title: string;
  source_name: string;
  original_url: string;
  source_excerpt?: string | null;
  feed_kind: FeedKind;
  published_at?: string | null;
  status?: EntryStatus;
  review_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export type EntryUpdate = Partial<EntryInsert>;

export interface CronLogRow {
  id: string;
  started_at: string;
  completed_at: string | null;
  feeds_parsed: number;
  entries_found: number;
  entries_inserted: number;
  anomaly_count: number;
  anomalies: Json;
  status: CronRunStatus;
  error_message: string | null;
}

export interface CronLogInsert {
  id?: string;
  started_at?: string;
  completed_at?: string | null;
  feeds_parsed?: number;
  entries_found?: number;
  entries_inserted?: number;
  anomaly_count?: number;
  anomalies?: Json;
  status?: CronRunStatus;
  error_message?: string | null;
}

export type CronLogUpdate = Partial<CronLogInsert>;

export interface Database {
  public: {
    Tables: {
      entries: {
        Row: EntryRow;
        Insert: EntryInsert;
        Update: EntryUpdate;
        Relationships: [];
      };
      cron_logs: {
        Row: CronLogRow;
        Insert: CronLogInsert;
        Update: CronLogUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
