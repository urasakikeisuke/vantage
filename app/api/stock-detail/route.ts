import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

// インスタンス化
const yahooFinance = new YahooFinance();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const range = searchParams.get("range") || "1y";

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
  }

  try {
    const endDate = new Date();
    const startDate = new Date();

    switch (range) {
      case "5y":
        startDate.setFullYear(endDate.getFullYear() - 5);
        break;
      case "6m":
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case "3m":
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case "1y":
      default:
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    // biome-ignore lint/suspicious/noExplicitAny: ライブラリの型定義が不完全なため
    const chartResult = await (yahooFinance as any).chart(symbol, {
      period1: startDate.toISOString().split("T")[0],
      period2: endDate.toISOString().split("T")[0],
      interval: range === "5y" ? "1wk" : "1d",
    });

    const history = chartResult.quotes || [];

    // biome-ignore lint/suspicious/noExplicitAny: ライブラリの型定義が不完全なため
    const summary = await (yahooFinance as any).quoteSummary(symbol, {
      modules: [
        "summaryProfile",
        "financialData",
        "defaultKeyStatistics",
        "summaryDetail",
        "quoteType",
      ],
    });

    const profile = summary.summaryProfile;
    const financial = summary.financialData;
    const stats = summary.defaultKeyStatistics;
    const summaryDetail = summary.summaryDetail;
    const quoteTypeData = summary.quoteType;

    return NextResponse.json({
      // biome-ignore lint/suspicious/noExplicitAny: 戻り値の型推論回避のため
      history: history.map((h: any) => ({
        date:
          h.date instanceof Date
            ? h.date.toISOString().split("T")[0]
            : h.date,
        close: h.close,
      })),
      details: {
        quoteType: quoteTypeData?.quoteType || "EQUITY",
        sector: profile?.sector || "不明",
        industry: profile?.industry || "-",
        description: profile?.longBusinessSummary || "",
        roe: financial?.returnOnEquity || null,
        roa: financial?.returnOnAssets || null,
        per: summaryDetail?.trailingPE || null,
        pbr: stats?.priceToBook || null,
        dividendYield: summaryDetail?.dividendYield || null,
        marketCap: summaryDetail?.marketCap || null,
        eps: stats?.trailingEps || null,
        profitMargin: financial?.profitMargins || null,
        beta: summaryDetail?.beta || null,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching stock detail:", error);

    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
