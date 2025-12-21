import type {
  Notification,
  PortfolioAnalysis,
  PriceAlert,
  RebalanceProposal,
  StockDetailData,
  StockPrice,
  Transaction,
  WatchlistItem,
} from "@/types";
import { APIError } from "./errors";
import { withRetry } from "./retry";

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  return withRetry(async () => {
    const res = await fetch(url, options);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new APIError(
        errorData.error || `HTTP ${res.status}: ${res.statusText}`,
        res.status,
      );
    }
    return res.json();
  });
}

export const api = {
  // 既存API
  searchStocks: async (query: string) => {
    return apiFetch<{
      options: Array<{
        symbol: string;
        name: string;
        type: string;
        exch: string;
      }>;
    }>(`/api/search?q=${encodeURIComponent(query)}`);
  },

  fetchStockDetail: async (
    symbol: string,
    range: string,
  ): Promise<StockDetailData> => {
    return apiFetch<StockDetailData>(
      `/api/stock-detail?symbol=${symbol}&range=${range}`,
    );
  },

  fetchStockPrices: async (
    symbols: string,
    options?: { includeMeta?: boolean },
  ): Promise<StockPrice[]> => {
    const metaParam = options?.includeMeta ? "&meta=1" : "";
    return apiFetch<StockPrice[]>(`/api/stocks?symbols=${symbols}${metaParam}`);
  },

  // ウォッチリストAPI
  fetchWatchlist: async (): Promise<WatchlistItem[]> => {
    return apiFetch<WatchlistItem[]>("/api/watchlist");
  },

  addToWatchlist: async (
    ticker: string,
    targetPrice?: number,
    notes?: string,
  ) => {
    return apiFetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, target_price: targetPrice, notes }),
    });
  },

  removeFromWatchlist: async (id: string) => {
    return apiFetch(`/api/watchlist/${id}`, { method: "DELETE" });
  },

  // 価格アラートAPI
  fetchPriceAlerts: async (): Promise<PriceAlert[]> => {
    return apiFetch<PriceAlert[]>("/api/price-alerts");
  },

  createPriceAlert: async (
    ticker: string,
    alertType: "above" | "below",
    targetPrice: number,
  ) => {
    return apiFetch("/api/price-alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticker,
        alert_type: alertType,
        target_price: targetPrice,
      }),
    });
  },

  deletePriceAlert: async (id: string) => {
    return apiFetch(`/api/price-alerts/${id}`, { method: "DELETE" });
  },

  updatePriceAlert: async (
    id: string,
    alertType: "above" | "below",
    targetPrice: number,
  ): Promise<PriceAlert> => {
    return apiFetch<PriceAlert>(`/api/price-alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        alert_type: alertType,
        target_price: targetPrice,
      }),
    });
  },

  setPriceAlertActive: async (
    id: string,
    isActive: boolean,
  ): Promise<PriceAlert> => {
    return apiFetch<PriceAlert>(`/api/price-alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: isActive }),
    });
  },

  // 通知センターAPI
  fetchNotifications: async (options?: {
    unread?: boolean;
    limit?: number;
  }): Promise<Notification[]> => {
    const params = new URLSearchParams();
    if (options?.unread) params.set("unread", "1");
    if (typeof options?.limit === "number") {
      params.set("limit", String(options.limit));
    }
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return apiFetch<Notification[]>(`/api/notifications${suffix}`);
  },

  fetchUnreadNotificationCount: async (): Promise<{ count: number }> => {
    return apiFetch<{ count: number }>("/api/notifications/unread-count");
  },

  markAllNotificationsRead: async (): Promise<{ success: boolean }> => {
    return apiFetch<{ success: boolean }>("/api/notifications/mark-all-read", {
      method: "POST",
    });
  },

  updateNotificationReadStatus: async (
    id: string,
    isRead: boolean,
  ): Promise<Notification> => {
    return apiFetch<Notification>(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_read: isRead }),
    });
  },

  deleteNotification: async (id: string): Promise<{ success: boolean }> => {
    return apiFetch<{ success: boolean }>(`/api/notifications/${id}`, {
      method: "DELETE",
    });
  },

  // 取引履歴API
  fetchTransactions: async (): Promise<Transaction[]> => {
    return apiFetch<Transaction[]>("/api/transactions");
  },

  addTransaction: async (data: Omit<Transaction, "id">) => {
    return apiFetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  // ポートフォリオ分析API
  fetchPortfolioAnalysis: async (): Promise<PortfolioAnalysis> => {
    return apiFetch<PortfolioAnalysis>("/api/analysis/portfolio");
  },

  fetchPortfolioSectors: async (): Promise<Record<string, number>> => {
    return apiFetch<Record<string, number>>("/api/analysis/sectors");
  },

  fetchRebalanceProposal: async (
    targetAllocation: Record<string, number>,
  ): Promise<RebalanceProposal[]> => {
    return apiFetch<RebalanceProposal[]>("/api/analysis/rebalance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_allocation: targetAllocation }),
    });
  },

  // AI推薦API
  fetchStockRecommendations: async (
    riskTolerance: "low" | "medium" | "high",
  ): Promise<
    Array<{
      ticker: string;
      name: string;
      reason: string;
      score: number;
      tags?: string[];
      sector?: string;
      breakdown?: {
        weights: Record<string, number>;
        normalized: Record<string, number>;
        contributions: Record<string, number>;
        inputs: Record<string, number | null>;
      };
      backtest?: {
        return1m: number | null;
        return3m: number | null;
        return6m: number | null;
        return1y: number | null;
      };
    }>
  > => {
    return apiFetch(`/api/ai/recommendations?risk=${riskTolerance}`);
  },

  fetchStockRecommendationsDiagnostics: async (
    riskTolerance: "low" | "medium" | "high",
  ): Promise<{
    recommendations: Array<{
      ticker: string;
      name: string;
      reason: string;
      score: number;
      tags?: string[];
      sector?: string;
      breakdown?: {
        weights: Record<string, number>;
        normalized: Record<string, number>;
        contributions: Record<string, number>;
        inputs: Record<string, number | null>;
      };
      backtest?: {
        return1m: number | null;
        return3m: number | null;
        return6m: number | null;
        return1y: number | null;
      };
    }>;
    diagnostics: {
      universeSize: number;
      excludedSize: number;
      candidateCount: number;
      eligibleCandidateCount: number;
      recommendationCount: number;
      cacheAgeMs: number | null;
      cacheSource: string | null;
      cacheFetchedAt: number | null;
      sectors: {
        eligibleCandidates: Record<string, number>;
        recommendations: Record<string, number>;
      };
      returns: {
        eligibleCandidates: Record<string, unknown>;
        recommendations: Record<string, unknown>;
      };
    };
  }> => {
    return apiFetch(
      `/api/ai/recommendations?risk=${riskTolerance}&diagnostics=1`,
    );
  },
};
