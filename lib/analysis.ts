// lib/analysis.ts
// ポートフォリオ分析ユーティリティ

import type { PortfolioRow, RebalanceProposal } from "@/types";

/**
 * ボラティリティ（標準偏差）を計算
 */
export function calculateVolatility(returns: number[]): number {
  if (returns.length === 0) return 0;

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const squaredDiffs = returns.map((r) => (r - mean) ** 2);
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / returns.length;

  return Math.sqrt(variance);
}

/**
 * シャープレシオを計算
 * (リターン - リスクフリーレート) / ボラティリティ
 */
export function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number = 0.001, // 0.1% (日本の無リスク金利)
): number {
  if (returns.length === 0) return 0;

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const volatility = calculateVolatility(returns);

  if (volatility === 0) return 0;

  return (avgReturn - riskFreeRate) / volatility;
}

/**
 * 最大ドローダウンを計算
 */
export function calculateMaxDrawdown(values: number[]): number {
  if (values.length === 0) return 0;

  let maxDrawdown = 0;
  let peak = values[0];

  for (const value of values) {
    if (value > peak) {
      peak = value;
    }
    const drawdown = (peak - value) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}

/**
 * ベータ値を計算（市場との相関）
 */
export function calculateBeta(
  portfolioReturns: number[],
  marketReturns: number[],
): number {
  if (
    portfolioReturns.length !== marketReturns.length ||
    portfolioReturns.length === 0
  ) {
    return 1; // デフォルト値
  }

  const n = portfolioReturns.length;
  const portfolioMean = portfolioReturns.reduce((sum, r) => sum + r, 0) / n;
  const marketMean = marketReturns.reduce((sum, r) => sum + r, 0) / n;

  let covariance = 0;
  let marketVariance = 0;

  for (let i = 0; i < n; i++) {
    covariance +=
      (portfolioReturns[i] - portfolioMean) * (marketReturns[i] - marketMean);
    marketVariance += (marketReturns[i] - marketMean) ** 2;
  }

  if (marketVariance === 0) return 1;

  return covariance / marketVariance;
}

/**
 * アルファ値を計算（市場を超過するリターン）
 */
export function calculateAlpha(
  portfolioReturn: number,
  marketReturn: number,
  beta: number,
  riskFreeRate: number = 0.001,
): number {
  return (
    portfolioReturn - (riskFreeRate + beta * (marketReturn - riskFreeRate))
  );
}

/**
 * 分散度スコアを計算（0-100）
 */
export function calculateDiversificationBreakdown(rows: PortfolioRow[]): {
  score: number;
  weights: { sector: number; ticker: number; currency: number; type: number };
  axes: {
    sector: {
      score: number;
      count: number;
      top: Array<{ name: string; percent: number }>;
    };
    ticker: {
      score: number;
      count: number;
      top: Array<{ name: string; percent: number }>;
    };
    currency: {
      score: number;
      count: number;
      top: Array<{ name: string; percent: number }>;
    };
    type: {
      score: number;
      count: number;
      top: Array<{ name: string; percent: number }>;
    };
  };
} {
  const weights = {
    sector: 0.45,
    ticker: 0.35,
    currency: 0.15,
    type: 0.05,
  };

  if (rows.length === 0) {
    return {
      score: 0,
      weights,
      axes: {
        sector: { score: 0, count: 0, top: [] },
        ticker: { score: 0, count: 0, top: [] },
        currency: { score: 0, count: 0, top: [] },
        type: { score: 0, count: 0, top: [] },
      },
    };
  }

  const getTypeLabel = (row: PortfolioRow) => {
    if (row.quoteType === "MUTUALFUND" || row.type === "MUTUALFUND")
      return "投資信託";
    if (row.quoteType === "ETF") return "ETF";
    if (row.quoteType === "EQUITY" || row.type === "EQUITY") return "株式";
    return row.quoteType || row.type || "その他";
  };

  const getSectorGroup = (row: PortfolioRow) => {
    const typeLabel = getTypeLabel(row);
    const sector = row.sector && row.sector !== "その他" ? row.sector : null;
    return sector || typeLabel || "その他";
  };

  const add = (map: Map<string, number>, key: string, value: number) => {
    map.set(key, (map.get(key) || 0) + value);
  };

  const tickerMap = new Map<string, number>();
  const sectorMap = new Map<string, number>();
  const currencyMap = new Map<string, number>();
  const typeMap = new Map<string, number>();

  let totalValue = 0;
  for (const row of rows) {
    const v = typeof row.currentValue === "number" ? row.currentValue : 0;
    if (!Number.isFinite(v) || v <= 0) continue;
    totalValue += v;

    add(tickerMap, row.ticker, v);
    add(sectorMap, getSectorGroup(row), v);
    add(currencyMap, row.currency || "JPY", v);
    add(typeMap, getTypeLabel(row), v);
  }

  if (totalValue <= 0) {
    return {
      score: 0,
      weights,
      axes: {
        sector: { score: 0, count: 0, top: [] },
        ticker: { score: 0, count: 0, top: [] },
        currency: { score: 0, count: 0, top: [] },
        type: { score: 0, count: 0, top: [] },
      },
    };
  }

  const normalizedDiversityScore = (map: Map<string, number>) => {
    const values = Array.from(map.values()).filter((v) => v > 0);
    const n = values.length;
    if (n <= 1) return 0;

    let herfindahl = 0;
    for (const value of values) {
      const weight = value / totalValue;
      herfindahl += weight * weight;
    }

    const denom = 1 - 1 / n;
    if (denom <= 0) return 0;
    const normalized = (1 - herfindahl) / denom;
    return Math.max(0, Math.min(1, normalized)) * 100;
  };

  const topEntries = (map: Map<string, number>) =>
    Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, value]) => ({
        name,
        percent: totalValue > 0 ? (value / totalValue) * 100 : 0,
      }));

  const sectorScore = normalizedDiversityScore(sectorMap);
  const tickerScore = normalizedDiversityScore(tickerMap);
  const currencyScore = normalizedDiversityScore(currencyMap);
  const typeScore = normalizedDiversityScore(typeMap);

  const score =
    sectorScore * weights.sector +
    tickerScore * weights.ticker +
    currencyScore * weights.currency +
    typeScore * weights.type;

  return {
    score: Math.min(100, Math.max(0, score)),
    weights,
    axes: {
      sector: {
        score: sectorScore,
        count: sectorMap.size,
        top: topEntries(sectorMap),
      },
      ticker: {
        score: tickerScore,
        count: tickerMap.size,
        top: topEntries(tickerMap),
      },
      currency: {
        score: currencyScore,
        count: currencyMap.size,
        top: topEntries(currencyMap),
      },
      type: { score: typeScore, count: typeMap.size, top: topEntries(typeMap) },
    },
  };
}

export function calculateDiversificationScore(rows: PortfolioRow[]): number {
  return calculateDiversificationBreakdown(rows).score;
}

/**
 * リバランス提案を生成
 */
export function generateRebalanceProposal(
  rows: PortfolioRow[],
  targetAllocation: Record<string, number>, // セクター名 -> 目標比率(%)
): RebalanceProposal[] {
  const totalValue = rows.reduce((sum, row) => sum + row.currentValue, 0);

  // 現在のセクター別保有額
  const currentAllocation = new Map<
    string,
    { value: number; rows: PortfolioRow[] }
  >();

  for (const row of rows) {
    const sector = row.sector || "その他";
    if (!currentAllocation.has(sector)) {
      currentAllocation.set(sector, { value: 0, rows: [] });
    }
    const allocation = currentAllocation.get(sector);
    if (allocation) {
      allocation.value += row.currentValue;
      allocation.rows.push(row);
    }
  }

  const proposals: RebalanceProposal[] = [];

  // 各セクターについて提案を生成
  for (const [sector, targetPercent] of Object.entries(targetAllocation)) {
    const targetValue = totalValue * (targetPercent / 100);
    const current = currentAllocation.get(sector);
    const currentValue = current?.value || 0;
    const diff = targetValue - currentValue;

    if (Math.abs(diff) < totalValue * 0.01) continue; // 1%未満の差は無視

    if (diff > 0) {
      // 買い増し提案
      proposals.push({
        ticker: sector,
        currentWeight: (currentValue / totalValue) * 100,
        targetWeight: targetPercent,
        action: "buy",
        shares: 0, // セクター全体なので株数は未定
        amount: diff,
      });
    } else {
      // 売却提案
      proposals.push({
        ticker: sector,
        currentWeight: (currentValue / totalValue) * 100,
        targetWeight: targetPercent,
        action: "sell",
        shares: 0,
        amount: Math.abs(diff),
      });
    }
  }

  return proposals.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
}

/**
 * 年率換算リターンを計算
 * 短期間のデータでは異常値になるため、最低30日以上のデータが必要
 */
export function calculateAnnualizedReturn(
  startValue: number,
  endValue: number,
  days: number,
): number {
  // データ不足または無効な値
  if (startValue === 0 || days === 0) return 0;

  // 30日未満の場合は単純リターンを返す（年率換算は不正確）
  if (days < 30) {
    return (endValue - startValue) / startValue;
  }

  const totalReturn = (endValue - startValue) / startValue;
  const years = days / 365;

  // 年率換算
  const annualized = (1 + totalReturn) ** (1 / years) - 1;

  // 異常値を防ぐ（-100%〜+1000%の範囲に制限）
  return Math.max(-1, Math.min(10, annualized));
}
