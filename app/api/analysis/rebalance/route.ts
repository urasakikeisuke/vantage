// app/api/analysis/rebalance/route.ts
import { NextResponse } from "next/server";
import { generateRebalanceProposal } from "@/lib/analysis";
import { DEFAULT_USDJPY, SYMBOL_USDJPY } from "@/lib/constants";
import { fetchStockPricesServer } from "@/lib/stocks";
import { createClient } from "@/lib/supabase/server";
import type { PortfolioItem } from "@/types";
import { calculatePortfolioItem } from "@/utils/calculator";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { target_allocation } = body;

    if (!target_allocation) {
      return NextResponse.json(
        { error: "Target allocation is required" },
        { status: 400 },
      );
    }

    // ポートフォリオデータ取得
    const { data: portfolios, error: portfolioError } = await supabase
      .from("portfolios")
      .select("*");

    if (portfolioError) throw portfolioError;
    if (!portfolios || portfolios.length === 0) {
      return NextResponse.json([]);
    }

    // 現在価格取得
    const symbolList = [...portfolios.map((p) => p.ticker), SYMBOL_USDJPY];
    const prices = await fetchStockPricesServer(symbolList);
    const pricesMap = new Map(prices.map((p) => [p.symbol, p]));
    const usdjpy = pricesMap.get(SYMBOL_USDJPY)?.price || DEFAULT_USDJPY;

    const rows = portfolios.map((p) =>
      calculatePortfolioItem(
        p as PortfolioItem,
        pricesMap.get(p.ticker),
        usdjpy,
      ),
    );

    // リバランス提案生成
    const proposals = generateRebalanceProposal(rows, target_allocation);

    return NextResponse.json(proposals);
  } catch (error) {
    console.error("Rebalance proposal error:", error);
    return NextResponse.json(
      { error: "Failed to generate rebalance proposal" },
      { status: 500 },
    );
  }
}
