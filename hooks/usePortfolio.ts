"use client";

import { useCallback, useEffect, useMemo } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { DEFAULT_USDJPY, SYMBOL_USDJPY } from "@/lib/constants";
import { logOperation } from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";
import type {
  GroupedPortfolio,
  HistoryData,
  PortfolioData,
  PortfolioItem,
  PortfolioRow,
} from "@/types";
import { calculatePortfolioItem } from "@/utils/calculator";

// SWRのキー
const KEY_PORTFOLIO = "portfolioData";
const KEY_HISTORY = "historyData";

type UsePortfolioOptions = {
  fallbackPortfolioData?: PortfolioData;
  fallbackHistoryData?: HistoryData[];
};

export const usePortfolio = (options: UsePortfolioOptions = {}) => {
  const supabase = useMemo(
    () => (typeof window === "undefined" ? null : createClient()),
    [],
  );

  // --- Data Fetchers ---

  const fetchPortfolioData = async () => {
    if (!supabase) {
      return (
        options.fallbackPortfolioData ?? {
          rows: [],
          totalValue: 0,
          totalInvestment: 0,
          totalStockInvestment: 0,
          totalDividend: 0,
          exchangeRate: null,
        }
      );
    }
    const { data: portfolios, error } = await supabase
      .from("portfolios")
      .select("*")
      .order("created_at", { ascending: true });

    if (error || !portfolios) throw error;

    if (portfolios.length === 0) {
      return {
        rows: [],
        totalValue: 0,
        totalInvestment: 0,
        totalStockInvestment: 0,
        totalDividend: 0,
        exchangeRate: null,
      };
    }

    const uniqueTickers = Array.from(
      new Set(
        portfolios.map((p) => (p.ticker || "").trim()).filter((t) => t !== ""),
      ),
    ).sort((a, b) => a.localeCompare(b));

    const symbols = [...uniqueTickers, SYMBOL_USDJPY].join(",");
    const prices = await api.fetchStockPrices(symbols, { includeMeta: true });

    const pricesMap = new Map(prices.map((p) => [p.symbol, p]));
    const usdjpy = pricesMap.get(SYMBOL_USDJPY)?.price || DEFAULT_USDJPY;

    let sumValue = 0;
    let sumInvestment = 0;
    let sumStockInv = 0;
    let sumDividend = 0;

    const combinedData = portfolios.map((p) => {
      const priceData = pricesMap.get(p.ticker);
      const row = calculatePortfolioItem(p as PortfolioItem, priceData, usdjpy);

      if (row.type !== "MUTUALFUND") sumStockInv += row.investmentValue;

      sumValue += row.currentValue;
      sumInvestment += row.investmentValue;
      sumDividend += row.annualDividend;

      return row;
    });

    return {
      rows: combinedData,
      totalValue: Math.round(sumValue),
      totalInvestment: Math.round(sumInvestment),
      totalStockInvestment: Math.round(sumStockInv),
      totalDividend: Math.round(sumDividend),
      exchangeRate: usdjpy,
    };
  };

  const fetchHistoryData = async () => {
    if (!supabase) return options.fallbackHistoryData ?? [];
    if (typeof navigator !== "undefined" && !navigator.onLine) return [];
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from("asset_history")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: true });

      return data || [];
    } catch (error) {
      if (typeof navigator !== "undefined" && !navigator.onLine) return [];
      if (
        error instanceof TypeError &&
        error.message.includes("Failed to fetch")
      ) {
        return [];
      }
      throw error;
    }
  };

  // --- SWR Hooks ---

  const {
    data: portfolioData,
    // error: portfolioError,
    isLoading: portfolioLoading,
    mutate: mutatePortfolio,
  } = useSWR(KEY_PORTFOLIO, fetchPortfolioData, {
    revalidateOnFocus: false,
    refreshInterval: 0, // 自動更新はしない（API制限考慮）
    fallbackData: options.fallbackPortfolioData,
  });

  const { data: historyData, mutate: mutateHistory } = useSWR(
    KEY_HISTORY,
    fetchHistoryData,
    {
      revalidateOnFocus: false,
      fallbackData: options.fallbackHistoryData,
    },
  );

  // --- Actions ---

  // 履歴記録 (Upsert回避: Select -> Insert/Update)
  const recordHistory = useCallback(
    async (totalVal: number, totalInv: number) => {
      if (totalVal === 0) return;
      try {
        if (!supabase) return;
        if (typeof navigator !== "undefined" && !navigator.onLine) return;
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const today = new Date().toISOString().split("T")[0];

        // 1. 既存データの確認
        const { data: existing, error: selectError } = await supabase
          .from("asset_history")
          .select("id")
          .eq("user_id", user.id)
          .eq("date", today)
          .maybeSingle();

        if (selectError) throw selectError;

        if (existing) {
          // 2. 更新
          const { error: updateError } = await supabase
            .from("asset_history")
            .update({ total_value: totalVal, total_investment: totalInv })
            .eq("id", existing.id);
          if (updateError) throw updateError;
        } else {
          // 3. 新規作成
          const { error: insertError } = await supabase
            .from("asset_history")
            .insert({
              user_id: user.id,
              date: today,
              total_value: totalVal,
              total_investment: totalInv,
            });
          if (insertError) throw insertError;
        }
        // 履歴データを再取得
        mutateHistory();
      } catch (error) {
        if (typeof navigator !== "undefined" && !navigator.onLine) return;
        if (
          error instanceof TypeError &&
          error.message.includes("Failed to fetch")
        )
          return;
        console.error("History record error:", error);
      }
    },
    [supabase, mutateHistory],
  );

  // 削除処理
  const deleteAsset = async (item: PortfolioRow) => {
    if (!supabase) return;
    if (!confirm(`本当に「${item.name || item.ticker}」を削除しますか？`))
      return;

    await logOperation(
      item.id,
      "delete",
      item.ticker,
      "削除",
      {
        ticker: item.ticker,
        shares: item.shares,
        acquisition_price: item.acquisition_price,
        account_type: item.account_type,
      },
      null,
    );

    const { error } = await supabase
      .from("portfolios")
      .delete()
      .eq("id", item.id);
    if (error) {
      alert(`削除に失敗しました: ${error.message}`);
    } else {
      mutatePortfolio();
    }
  };

  // 手動更新用ラッパー
  const refreshAll = async (_isRefresh = false) => {
    if (!supabase) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    // isRefreshがtrueならキャッシュを破棄して再取得（SWRのmutateを使用）
    await mutatePortfolio();
    await mutateHistory();
  };

  // --- Effects ---

  // データロード完了後に履歴を記録 (1日1回相当)
  useEffect(() => {
    if (!portfolioLoading && portfolioData && portfolioData.totalValue > 0) {
      // 少し遅延させて実行（UI描画優先）
      const timer = setTimeout(() => {
        recordHistory(portfolioData.totalValue, portfolioData.totalInvestment);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [portfolioLoading, portfolioData, recordHistory]);

  // --- Grouping Logic (Memoized) ---
  const groupedRows: GroupedPortfolio[] = useMemo(() => {
    if (!portfolioData?.rows) return [];

    const groups = new Map<string, GroupedPortfolio>();

    portfolioData.rows.forEach((row) => {
      const existing = groups.get(row.ticker);
      if (existing) {
        existing.totalShares += Number(row.shares);
        existing.totalCurrentValue += row.currentValue;
        existing.totalInvestmentValue += row.investmentValue;
        existing.totalGainLoss += row.gainLoss;
        existing.totalAnnualDividend += row.annualDividend;
        existing.totalAfterTaxGain += row.afterTaxGain;
        existing.items.push(row);
      } else {
        groups.set(row.ticker, {
          ticker: row.ticker,
          name: row.name,
          totalShares: Number(row.shares),
          averageAcquisitionPrice: 0, // 後で計算
          totalCurrentValue: row.currentValue,
          totalInvestmentValue: row.investmentValue,
          totalGainLoss: row.gainLoss,
          totalGainLossPercent: 0, // 後で計算
          totalAnnualDividend: row.annualDividend,
          totalAfterTaxGain: row.afterTaxGain,
          currentPrice: row.currentPrice,
          currency: row.currency,
          type: row.type || "EQUITY",
          items: [row],
        });
      }
    });

    return Array.from(groups.values()).map((g) => {
      const totalAcqRaw = g.items.reduce(
        (sum, item) => sum + item.acquisition_price * item.shares,
        0,
      );
      g.averageAcquisitionPrice = totalAcqRaw / g.totalShares;

      g.totalGainLossPercent =
        g.totalInvestmentValue !== 0
          ? (g.totalGainLoss / g.totalInvestmentValue) * 100
          : 0;

      return g;
    });
  }, [portfolioData]);

  return {
    rows: portfolioData?.rows || [],
    groupedRows,
    historyData: historyData || [],
    loading: portfolioLoading && !portfolioData,
    totalValue: portfolioData?.totalValue || 0,
    totalInvestment: portfolioData?.totalInvestment || 0,
    totalStockInvestment: portfolioData?.totalStockInvestment || 0,
    totalDividend: portfolioData?.totalDividend || 0,
    exchangeRate: portfolioData?.exchangeRate || null,
    fetchPortfolioData: refreshAll, // インターフェース互換性のため名前維持
    deleteAsset,
  };
};
