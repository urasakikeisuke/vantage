import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import stockData from "../../../data/jp_stocks.json";

const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

type StockPrice = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  shortName: string;
  dividendRate: number;
  type?: string;
  sector?: string;
  quoteType?: string;
};

async function fetchJapanFund(code: string): Promise<StockPrice | null> {
  try {
    const url = `https://finance.yahoo.co.jp/quote/${code}`;
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };

    const res = await fetch(url, { headers, next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const html = await res.text();

    let price = 0;

    const regex = /class="StyledNumber__value__[^"]*">([0-9,]+)<\/span>/;
    const match = html.match(regex);

    if (match?.[1]) {
      price = parseFloat(match[1].replace(/,/g, ""));
    }

    if (!price) {
      console.warn(`Price not found for ${code}. HTML length: ${html.length}`);
      // ここでフォールバックロジックを入れる余地があるが、
      // 現状はnullを返して呼び出し元で処理する（あるいはDBの前回値を参照するなど）
      return null;
    }

    let name = "投資信託";
    const masterInfo = (stockData as { symbol: string; name: string }[]).find(
      (s) => s.symbol === code,
    );
    if (masterInfo) {
      name = masterInfo.name;
    }

    return {
      symbol: code,
      price: price,
      change: 0,
      changePercent: 0,
      currency: "JPY",
      shortName: name,
      dividendRate: 0,
      type: "MUTUALFUND",
      quoteType: "MUTUALFUND",
      sector: "投資信託",
    };
  } catch (e) {
    console.error(`Fund error ${code}:`, e);
    return null;
  }
}

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get("symbols");
  const includeMeta = searchParams.get("meta") === "1";

  if (!symbolsParam) {
    return NextResponse.json({ error: "No symbols" }, { status: 400 });
  }

  const symbols = Array.from(
    new Set(
      symbolsParam
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== ""),
    ),
  ).sort((a, b) => a.localeCompare(b));

  try {
    const quotes = await Promise.all(
      symbols.map(async (symbol) => {
        const isFund =
          !symbol.includes(".") &&
          symbol !== "USDJPY=X" &&
          /^[0-9A-Z]{8,10}$/.test(symbol);
        if (isFund) {
          return await fetchJapanFund(symbol);
        }

        try {
          const quote = await yf.quote(
            symbol,
            { lang: "ja", region: "JP" },
            { validateResult: false },
          );

          let sector = "その他";
          let quoteType = quote.quoteType;

          const sectorMap: Record<string, string> = {
            "Financial Services": "金融",
            Technology: "テクノロジー",
            "Consumer Cyclical": "一般消費財",
            "Consumer Defensive": "生活必需品",
            Healthcare: "ヘルスケア",
            Industrials: "資本財",
            Energy: "エネルギー",
            Utilities: "公共事業",
            "Real Estate": "不動産",
            "Basic Materials": "素材",
            "Communication Services": "通信",
          };

          if (includeMeta && symbol !== "USDJPY=X") {
            try {
              // biome-ignore lint/suspicious/noExplicitAny: ライブラリ型不備対応
              const summary = await (yf as any).quoteSummary(symbol, {
                modules: ["summaryProfile", "quoteType"],
              });
              if (summary.summaryProfile?.sector) {
                const englishSector = summary.summaryProfile.sector;
                sector = sectorMap[englishSector] || englishSector;
              }
              if (summary.quoteType?.quoteType) {
                quoteType = summary.quoteType.quoteType;
              }
            } catch (e) {
              console.warn(`Sector fetch failed for ${symbol}`, e);
            }
          }

          if (quoteType === "ETF") sector = "ETF";

          let stockName = quote.longName || quote.shortName || symbol;
          const masterInfo = (
            stockData as { symbol: string; name: string }[]
          ).find((s) => s.symbol === symbol);
          if (masterInfo) {
            stockName = masterInfo.name;
          }

          return {
            symbol: symbol,
            price: quote.regularMarketPrice || quote.ask || quote.bid || 0,
            change: quote.regularMarketChange || 0,
            changePercent: quote.regularMarketChangePercent || 0,
            currency: quote.currency || "JPY",
            shortName: stockName,
            dividendRate:
              quote.trailingAnnualDividendRate || quote.dividendRate || 0,
            type: quoteType,
            quoteType: quoteType,
            sector: sector,
          } as StockPrice;
        } catch (e) {
          console.error(`Error fetching ${symbol}:`, e);
          return null;
        }
      }),
    );

    const validQuotes = quotes.filter((q) => q !== null);
    return NextResponse.json(validQuotes, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (_error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
