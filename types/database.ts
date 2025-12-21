// types/database.ts
// Supabase データベースの型定義

export interface Database {
  public: {
    Tables: {
      portfolios: {
        Row: Portfolio;
        Insert: Omit<Portfolio, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Portfolio, "id" | "created_at">>;
      };
      asset_history: {
        Row: AssetHistory;
        Insert: Omit<AssetHistory, "id" | "created_at">;
        Update: Partial<Omit<AssetHistory, "id" | "created_at">>;
      };
      operation_logs: {
        Row: OperationLog;
        Insert: Omit<OperationLog, "id" | "created_at">;
        Update: Partial<Omit<OperationLog, "id" | "created_at">>;
      };
      watchlist: {
        Row: WatchlistItem;
        Insert: Omit<WatchlistItem, "id" | "created_at">;
        Update: Partial<Omit<WatchlistItem, "id" | "created_at">>;
      };
      price_alerts: {
        Row: PriceAlert;
        Insert: Omit<PriceAlert, "id" | "created_at">;
        Update: Partial<Omit<PriceAlert, "id" | "created_at">>;
      };
      dividend_history: {
        Row: DividendHistory;
        Insert: Omit<DividendHistory, "id" | "created_at">;
        Update: Partial<Omit<DividendHistory, "id" | "created_at">>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, "id" | "created_at">;
        Update: Partial<Omit<Transaction, "id" | "created_at">>;
      };
      nisa_quota: {
        Row: NisaQuota;
        Insert: Omit<NisaQuota, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<NisaQuota, "id" | "created_at">>;
      };
      user_preferences: {
        Row: UserPreferences;
        Insert: Omit<UserPreferences, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<UserPreferences, "id" | "created_at">>;
      };
      notifications: {
        Row: InAppNotification;
        Insert: Omit<InAppNotification, "id" | "created_at" | "read_at">;
        Update: Partial<Omit<InAppNotification, "id" | "created_at">>;
      };
    };
  };
}

export interface Portfolio {
  id: string;
  user_id: string;
  ticker: string;
  shares: number;
  acquisition_price: number;
  account_type: "nisa_growth" | "nisa_tsumitate" | "specific" | "general";
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssetHistory {
  id: string;
  user_id: string;
  date: string;
  total_value: number;
  total_investment: number;
  created_at: string;
}

export interface OperationLog {
  id: string;
  user_id: string;
  portfolio_id: string | null;
  operation_type: "add" | "edit" | "delete" | "buy_more" | "sell";
  ticker: string;
  details: string;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

export interface WatchlistItem {
  id: string;
  user_id: string;
  ticker: string;
  target_price: number | null;
  notes: string | null;
  created_at: string;
}

export interface PriceAlert {
  id: string;
  user_id: string;
  ticker: string;
  alert_type: "above" | "below";
  target_price: number;
  is_active: boolean;
  triggered_at: string | null;
  created_at: string;
}

export interface DividendHistory {
  id: string;
  user_id: string;
  portfolio_id: string;
  ticker: string;
  payment_date: string;
  amount: number;
  currency: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  portfolio_id: string;
  ticker: string;
  transaction_type: "buy" | "sell";
  shares: number;
  price: number;
  fee: number;
  total_amount: number;
  transaction_date: string;
  notes: string | null;
  created_at: string;
}

export interface NisaQuota {
  id: string;
  user_id: string;
  year: number;
  growth_used: number;
  growth_limit: number;
  tsumitate_used: number;
  tsumitate_limit: number;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: "light" | "dark" | "auto";
  dashboard_layout: Record<string, unknown>;
  notification_settings: {
    price_alerts: boolean;
    goal_notifications: boolean;
    dividend_reminders: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface InAppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}
