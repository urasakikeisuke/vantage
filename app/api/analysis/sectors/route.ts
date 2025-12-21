// app/api/analysis/sectors/route.ts
import { NextResponse } from "next/server";
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
      return NextResponse.json({});
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

    // セクター別に集計
    const sectorValues: Record<string, number> = {};
    for (const row of rows) {
      const sector = row.sector || "その他";
      sectorValues[sector] = (sectorValues[sector] || 0) + row.currentValue;
    }

    return NextResponse.json(sectorValues);
  } catch (error) {
    console.error("Sectors fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sectors" },
      { status: 500 },
    );
  }
}
