"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { logOperation } from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";
import type {
  GroupedPortfolio,
  HistoryData,
  PortfolioRow,
  StockPrice,
} from "@/types";

export const usePortfolio = () => {
  const [rows, setRows] = useState<PortfolioRow[]>([]);
  const [historyData, setHistoryData] = useState<HistoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);
  const [totalInvestment, setTotalInvestment] = useState(0);
  const [totalStockInvestment, setTotalStockInvestment] = useState(0);
  const [totalDividend, setTotalDividend] = useState(0);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  const supabase = createClient();

  // 履歴記録
  const recordHistory = useCallback(
    async (totalVal: number, totalInv: number) => {
      if (totalVal === 0) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];
      const { data: existing } = await supabase
        .from("asset_history")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .single();

      if (existing) {
        await supabase
          .from("asset_history")
          .update({ total_value: totalVal, total_investment: totalInv })
          .eq("id", existing.id);
      } else {
        await supabase.from("asset_history").insert({
          user_id: user.id,
          date: today,
          total_value: totalVal,
          total_investment: totalInv,
        });
      }
    },
    [supabase],
  );

  // 履歴取得
  const fetchHistory = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("asset_history")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: true });

    if (data) setHistoryData(data);
  }, [supabase]);

  // データ取得メイン
  const fetchPortfolioData = useCallback(
    async (isRefresh = false) => {
      try {
        if (!isRefresh) setLoading(true);

        const { data: portfolios, error } = await supabase
          .from("portfolios")
          .select("*")
          .order("created_at", { ascending: true });

        if (error || !portfolios) throw error;

        if (portfolios.length === 0) {
          setRows([]);
          setTotalValue(0);
          setTotalInvestment(0);
          setTotalStockInvestment(0);
          setTotalDividend(0);
          setLoading(false);
          return;
        }

        const symbols = `${portfolios.map((p) => p.ticker).join(",")},USDJPY=X`;
        const res = await fetch(`/api/stocks?symbols=${symbols}`);
        const prices: StockPrice[] = await res.json();

        const usdjpy =
          prices.find((p) => p.symbol === "USDJPY=X")?.price || 150;
        setExchangeRate(usdjpy);

        let sumValue = 0;
        let sumInvestment = 0;
        let sumStockInv = 0;
        let sumDividend = 0;

        const combinedData = portfolios.map((p) => {
          const priceData = prices.find((price) => price.symbol === p.ticker);
          const currency = priceData?.currency || "JPY";
          const rawPrice = priceData?.price || 0;
          const rate = currency === "USD" ? usdjpy : 1;
          const type = priceData?.type || "EQUITY";

          const currentPriceInYen = rawPrice * rate;
          let currentValue = 0;
          let investmentInYen = 0;

          if (type === "MUTUALFUND") {
            currentValue = (currentPriceInYen * p.shares) / 10000;
            investmentInYen = (p.acquisition_price * rate * p.shares) / 10000;
          } else {
            currentValue = currentPriceInYen * p.shares;
            investmentInYen = p.acquisition_price * rate * p.shares;
          }

          if (type !== "MUTUALFUND") sumStockInv += investmentInYen;

          const dividendRaw = priceData?.dividendRate || 0;
          const annualDividend =
            type === "MUTUALFUND"
              ? (dividendRaw * rate * p.shares) / 10000
              : dividendRaw * rate * p.shares;

          const gainLoss = currentValue - investmentInYen;
          const isNisa = p.account_type?.includes("nisa");
          let afterTaxGain = gainLoss;
          if (!isNisa && gainLoss > 0) afterTaxGain = gainLoss * (1 - 0.20315);

          sumValue += currentValue;
          sumInvestment += investmentInYen;
          sumDividend += annualDividend;

          return {
            ...p,
            currency,
            originalPrice: rawPrice,
            currentPrice: currentPriceInYen,
            currentValue,
            investmentValue: investmentInYen,
            gainLoss,
            gainLossPercent:
              investmentInYen !== 0 ? (gainLoss / investmentInYen) * 100 : 0,
            name: priceData?.shortName || p.ticker,
            annualDividend,
            afterTaxGain,
            type,
          } as PortfolioRow;
        });

        setRows(combinedData);
        setTotalValue(Math.round(sumValue));
        setTotalInvestment(Math.round(sumInvestment));
        setTotalStockInvestment(Math.round(sumStockInv));
        setTotalDividend(Math.round(sumDividend));

        await recordHistory(sumValue, sumInvestment);
        await fetchHistory();
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    },
    [recordHistory, fetchHistory, supabase],
  );

  // 削除処理
  const deleteAsset = async (item: PortfolioRow) => {
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
      fetchPortfolioData();
    }
  };

  const groupedRows: GroupedPortfolio[] = useMemo(() => {
    const groups = new Map<string, GroupedPortfolio>();

    rows.forEach((row) => {
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
      // 平均取得単価 = 総投資額 / (総保有数 * 為替レート(概算))
      // 正確には (各行の取得単価 * 株数) の合計 / 総株数
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
  }, [rows]);

  useEffect(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  return {
    rows,
    groupedRows,
    historyData,
    loading,
    totalValue,
    totalInvestment,
    totalStockInvestment,
    totalDividend,
    exchangeRate,
    fetchPortfolioData,
    deleteAsset,
  };
};
