// app/api/watchlist/route.ts
import { NextResponse } from "next/server";
import { fetchStockPricesServer } from "@/lib/stocks";
import { createClient } from "@/lib/supabase/server";

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
    const { data: watchlist, error } = await supabase
      .from("watchlist")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // 現在価格を取得
    if (watchlist && watchlist.length > 0) {
      const tickerList = watchlist.map((item) => item.ticker);
      const prices = await fetchStockPricesServer(tickerList);
      const priceMap = new Map(prices.map((p) => [p.symbol, p]));

      const enrichedWatchlist = watchlist.map((item) => ({
        ...item,
        currentPrice: priceMap.get(item.ticker)?.price,
        priceChange: priceMap.get(item.ticker)?.change,
        priceChangePercent: priceMap.get(item.ticker)?.changePercent,
        name: priceMap.get(item.ticker)?.shortName,
      }));

      return NextResponse.json(enrichedWatchlist);
    }

    return NextResponse.json(watchlist || []);
  } catch (error) {
    console.error("Watchlist fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch watchlist" },
      { status: 500 },
    );
  }
}

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
    const { ticker, target_price, notes } = body;

    if (!ticker) {
      return NextResponse.json(
        { error: "Ticker is required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("watchlist")
      .insert([
        { user_id: user.id, ticker: ticker.toUpperCase(), target_price, notes },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Watchlist add error:", error);
    return NextResponse.json(
      { error: "Failed to add to watchlist" },
      { status: 500 },
    );
  }
}
