// app/api/analysis/portfolio/route.ts
import { NextResponse } from "next/server";
import {
  calculateAlpha,
  calculateAnnualizedReturn,
  calculateBeta,
  calculateDiversificationBreakdown,
  calculateDiversificationScore,
  calculateMaxDrawdown,
  calculateSharpeRatio,
  calculateVolatility,
} from "@/lib/analysis";
import { DEFAULT_USDJPY, SYMBOL_USDJPY } from "@/lib/constants";
import { fetchStockPricesServer } from "@/lib/stocks";
import { createClient } from "@/lib/supabase/server";
import type { PortfolioItem } from "@/types";
import { calculatePortfolioItem } from "@/utils/calculator";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ポートフォリオデータ取得
    const { data: portfolios, error: portfolioError } = await supabase
      .from("portfolios")
      .select("*");

    if (portfolioError) throw portfolioError;
    if (!portfolios || portfolios.length === 0) {
      const diversificationBreakdown = calculateDiversificationBreakdown([]);
      return NextResponse.json({
        totalReturn: 0,
        annualizedReturn: 0,
        volatility: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        beta: 1,
        alpha: 0,
        diversificationScore: 0,
        diversificationBreakdown,
        estimatedDividend: 0,
        dividendYield: 0,
      });
    }

    // 現在価格取得
    const symbolList = [...portfolios.map((p) => p.ticker), SYMBOL_USDJPY];
    const prices = await fetchStockPricesServer(symbolList, {
      includeMeta: true,
    });
    const pricesMap = new Map(prices.map((p) => [p.symbol, p]));
    const usdjpy = pricesMap.get(SYMBOL_USDJPY)?.price || DEFAULT_USDJPY;

    const rows = portfolios.map((p) =>
      calculatePortfolioItem(
        p as PortfolioItem,
        pricesMap.get(p.ticker),
        usdjpy,
      ),
    );

    // 資産履歴取得
    const { data: history } = await supabase
      .from("asset_history")
      .select("*")
      .order("date", { ascending: true });

    const values = history?.map((h) => h.total_value) || [];
    const returns = values.slice(1).map((v, i) => (v - values[i]) / values[i]);

    // 総リターン
    const totalValue = rows.reduce((sum, r) => sum + r.currentValue, 0);
    const totalInvestment = rows.reduce((sum, r) => sum + r.investmentValue, 0);
    const totalReturn =
      totalInvestment > 0
        ? (totalValue - totalInvestment) / totalInvestment
        : 0;

    // 年率換算リターン
    const days = history?.length || 1;
    const annualizedReturn = calculateAnnualizedReturn(
      totalInvestment,
      totalValue,
      days,
    );

    // ボラティリティとシャープレシオ
    const volatility = calculateVolatility(returns);
    const sharpeRatio = calculateSharpeRatio(returns);

    // 最大ドローダウン
    const maxDrawdown = calculateMaxDrawdown(values);

    // ベータとアルファ（仮想的な市場リターン）
    const marketReturns = returns.map(() => 0.0003); // 仮: 0.03%/日
    const beta = calculateBeta(returns, marketReturns);
    const alpha = calculateAlpha(totalReturn, 0.05, beta); // 仮: 市場リターン5%

    // 分散度スコア
    const diversificationBreakdown = calculateDiversificationBreakdown(rows);
    const diversificationScore = calculateDiversificationScore(rows);

    // 予想年間配当
    const estimatedDividend = rows.reduce(
      (sum, r) => sum + (r.annualDividend || 0),
      0,
    );
    const dividendYield =
      totalValue > 0 ? (estimatedDividend / totalValue) * 100 : 0;

    return NextResponse.json({
      totalReturn,
      annualizedReturn,
      volatility,
      sharpeRatio,
      maxDrawdown,
      beta,
      alpha,
      diversificationScore,
      diversificationBreakdown,
      estimatedDividend,
      dividendYield,
    });
  } catch (error) {
    console.error("Portfolio analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze portfolio" },
      { status: 500 },
    );
  }
}
