// app/page.tsx
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/DashboardClient";
import { DEFAULT_USDJPY, SYMBOL_USDJPY } from "@/lib/constants";
import { fetchStockPricesServer } from "@/lib/stocks";
import { createClient } from "@/lib/supabase/server";
import type {
  HistoryData,
  PortfolioData,
  PortfolioItem,
  StockPrice,
} from "@/types";
import { calculatePortfolioItem } from "@/utils/calculator";

const fetchStockPricesCached = unstable_cache(
  async (symbols: string[]) => {
    return fetchStockPricesServer(symbols, { includeMeta: true });
  },
  [],
  { revalidate: 60 },
);

export default async function Home() {
  const supabase = await createClient();

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [portfoliosRes, historyRes] = await Promise.all([
    supabase
      .from("portfolios")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase
      .from("asset_history")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: true }),
  ]);

  // データ分割
  const portfolioItems = (portfoliosRes.data || []) as PortfolioItem[];
  const initialHistoryData = (historyRes.data || []) as HistoryData[];

  let initialPortfolioData: PortfolioData = {
    rows: [],
    totalValue: 0,
    totalInvestment: 0,
    totalStockInvestment: 0,
    totalDividend: 0,
    exchangeRate: null,
  };

  // ハンドラ
  if (portfolioItems.length > 0) {
    const uniqueTickers = Array.from(
      new Set(
        portfolioItems
          .map((p) => (p.ticker || "").trim())
          .filter((t) => t !== ""),
      ),
    ).sort((a, b) => a.localeCompare(b));

    const symbols = [...uniqueTickers, SYMBOL_USDJPY];
    const prices = await fetchStockPricesCached(symbols);
    const pricesMap = new Map(prices.map((p) => [p.symbol, p as StockPrice]));
    const usdjpy = pricesMap.get(SYMBOL_USDJPY)?.price || DEFAULT_USDJPY;

    let sumValue = 0;
    let sumInvestment = 0;
    let sumStockInv = 0;
    let sumDividend = 0;

    const combinedData = portfolioItems.map((p) => {
      const priceData = pricesMap.get(p.ticker);
      const row = calculatePortfolioItem(p, priceData, usdjpy);

      if (row.type !== "MUTUALFUND") sumStockInv += row.investmentValue;

      sumValue += row.currentValue;
      sumInvestment += row.investmentValue;
      sumDividend += row.annualDividend;

      return row;
    });

    initialPortfolioData = {
      rows: combinedData,
      totalValue: Math.round(sumValue),
      totalInvestment: Math.round(sumInvestment),
      totalStockInvestment: Math.round(sumStockInv),
      totalDividend: Math.round(sumDividend),
      exchangeRate: usdjpy,
    };
  }

  return (
    <DashboardClient
      initialPortfolioData={initialPortfolioData}
      initialHistoryData={initialHistoryData}
    />
  );
}
