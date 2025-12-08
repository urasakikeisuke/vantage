// app/api/stocks/route.ts
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
      console.warn(`Price not found for ${code}`);
      return null;
    }

    let name = "投資信託";
    const masterInfo = stockData.find((s) => s.symbol === code);
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
    };
  } catch (e) {
    console.error(`Fund error ${code}:`, e);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get("symbols");

  if (!symbolsParam) {
    return NextResponse.json({ error: "No symbols" }, { status: 400 });
  }

  const symbols = symbolsParam.split(",");

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

          let stockName = quote.longName || quote.shortName || symbol;
          const masterInfo = stockData.find((s) => s.symbol === symbol);
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
            type: quote.quoteType,
          } as StockPrice;
        } catch (e) {
          console.error(`Error fetching ${symbol}:`, e);
          return null;
        }
      }),
    );

    const validQuotes = quotes.filter((q) => q !== null);
    return NextResponse.json(validQuotes);
  } catch (_error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
