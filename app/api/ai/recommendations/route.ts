// app/api/ai/recommendations/route.ts

import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import stockData from "@/data/jp_stocks.json";
import { calculateDiversificationScore } from "@/lib/analysis";
import { DEFAULT_USDJPY, SYMBOL_USDJPY } from "@/lib/constants";
import { fetchStockPricesServer } from "@/lib/stocks";
import { createClient } from "@/lib/supabase/server";
import type { PortfolioItem, PortfolioRow } from "@/types";
import { calculatePortfolioItem } from "@/utils/calculator";

export const runtime = "nodejs";

type StockMasterRow = {
  symbol: string;
  name: string;
  type?: string;
  exch?: string;
};

const STOCK_MASTER_ROWS = stockData as StockMasterRow[];
const STOCK_MASTER_NAME = new Map(
  STOCK_MASTER_ROWS.map((r) => [r.symbol.toUpperCase(), r.name]),
);
const STOCK_MASTER_TYPE = new Map(
  STOCK_MASTER_ROWS.map((r) => [r.symbol.toUpperCase(), r.type || "EQUITY"]),
);

// 銘柄マスターデータ（本番では外部API/DBから取得）
const STOCK_UNIVERSE: readonly string[] = Array.from(
  new Set(
    STOCK_MASTER_ROWS.filter((s) => s.symbol && s.type !== "MUTUALFUND").map(
      (s) => s.symbol.toUpperCase(),
    ),
  ),
);

const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

type StockCandidateFactors = {
  symbol: string;
  name: string;
  quoteType: string;
  sector: string;
  dividendYield: number | null;
  per: number | null;
  beta: number | null;
  roe: number | null;
  profitMargin: number | null;
  momentum6m: number | null;
  return1m: number | null;
  return3m: number | null;
  return1y: number | null;
  volatility: number | null;
};

let cachedFactors:
  | {
      fetchedAt: number;
      items: StockCandidateFactors[];
    }
  | undefined;

let inflightCandidateFactors: Promise<StockCandidateFactors[]> | undefined;

let lastCandidateFactorsMeta:
  | {
      source: "memory" | "disk" | "rebuild";
      fetchedAt: number;
    }
  | undefined;

const FACTOR_CACHE_TTL_MS = 1000 * 60 * 60 * 6;

const PERSISTENT_CACHE_DIR = path.join(process.cwd(), ".cache");
const PERSISTENT_CACHE_FILE = path.join(
  PERSISTENT_CACHE_DIR,
  "ai_candidate_factors.json",
);

async function readPersistentCache(): Promise<{
  fetchedAt: number;
  items: StockCandidateFactors[];
} | null> {
  try {
    const raw = await fs.readFile(PERSISTENT_CACHE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as {
      fetchedAt?: unknown;
      items?: unknown;
    };
    if (typeof parsed.fetchedAt !== "number") return null;
    if (!Array.isArray(parsed.items)) return null;

    const fixed = (parsed.items as StockCandidateFactors[]).map((item) => {
      const symbolKey = (item.symbol || "").toUpperCase();
      const name = STOCK_MASTER_NAME.get(symbolKey) || item.name || item.symbol;
      const quoteType =
        item.quoteType || STOCK_MASTER_TYPE.get(symbolKey) || "EQUITY";
      const sector = quoteType === "ETF" ? "ETF" : item.sector || "その他";
      return {
        ...item,
        name,
        quoteType,
        sector,
      } satisfies StockCandidateFactors;
    });

    return {
      fetchedAt: parsed.fetchedAt,
      items: fixed,
    };
  } catch {
    return null;
  }
}

async function writePersistentCache(cache: {
  fetchedAt: number;
  items: StockCandidateFactors[];
}) {
  try {
    await fs.mkdir(PERSISTENT_CACHE_DIR, { recursive: true });
    await fs.writeFile(PERSISTENT_CACHE_FILE, JSON.stringify(cache), "utf-8");
  } catch {
    // ignore
  }
}

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

function toNumber(v: unknown): number | null {
  if (typeof v !== "number") return null;
  if (Number.isNaN(v)) return null;
  if (!Number.isFinite(v)) return null;
  return v;
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function normalizeMinMax(values: Array<number | null>, value: number | null) {
  const valid = values.filter((v): v is number => typeof v === "number");
  if (valid.length < 2) return 0.5;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (max === min) return 0.5;
  if (value == null) return 0.5;
  return clamp01((value - min) / (max - min));
}

function stddev(values: number[]) {
  if (values.length < 2) return null;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const v =
    values.reduce((s, x) => s + (x - mean) * (x - mean), 0) /
    (values.length - 1);
  return Math.sqrt(v);
}

function dedupeCandidates(items: StockCandidateFactors[]) {
  const seen = new Set<string>();
  const out: StockCandidateFactors[] = [];
  for (const it of items) {
    const k = (it.symbol || "").toUpperCase();
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

function dedupeByTicker<T extends { ticker: string }>(items: T[]) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const k = (it.ticker || "").toUpperCase();
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

function countBy<T>(items: T[], keyFn: (item: T) => string) {
  const out: Record<string, number> = {};
  for (const it of items) {
    const k = keyFn(it) || "その他";
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function summarizeOne(values: Array<number | null | undefined>) {
  const v = values.filter((x): x is number => typeof x === "number");
  if (v.length === 0) {
    return {
      count: 0,
      mean: null,
      median: null,
      min: null,
      max: null,
      pctPositive: null,
    };
  }
  const meanVal = v.reduce((s, x) => s + x, 0) / v.length;
  const med = median(v);
  const minVal = Math.min(...v);
  const maxVal = Math.max(...v);
  const pctPositive = v.filter((x) => x > 0).length / v.length;
  return {
    count: v.length,
    mean: meanVal,
    median: med,
    min: minVal,
    max: maxVal,
    pctPositive,
  };
}

function summarizeReturns(
  items: Array<
    | StockCandidateFactors
    | {
        backtest?: {
          return1m: number | null;
          return3m: number | null;
          return6m: number | null;
          return1y: number | null;
        };
      }
  >,
) {
  const get = <K extends "return1m" | "return3m" | "return6m" | "return1y">(
    it: (typeof items)[number],
    key: K,
  ) => {
    if ("backtest" in it && it.backtest) return it.backtest[key];
    if (key === "return6m" && "momentum6m" in it) return it.momentum6m;
    if (key in it)
      return (it as StockCandidateFactors)[
        key as keyof StockCandidateFactors
      ] as number | null;
    return null;
  };

  return {
    return1m: summarizeOne(items.map((it) => get(it, "return1m"))),
    return3m: summarizeOne(items.map((it) => get(it, "return3m"))),
    return6m: summarizeOne(items.map((it) => get(it, "return6m"))),
    return1y: summarizeOne(items.map((it) => get(it, "return1y"))),
  };
}

async function mapWithConcurrency<T, U>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<U>,
): Promise<U[]> {
  const results: U[] = [];
  let idx = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }).map(
    async () => {
      while (idx < items.length) {
        const current = idx;
        idx += 1;
        results[current] = await fn(items[current]);
      }
    },
  );

  await Promise.all(workers);
  return results;
}

async function fetchCandidateFactors(): Promise<StockCandidateFactors[]> {
  const now = Date.now();
  if (cachedFactors && now - cachedFactors.fetchedAt < FACTOR_CACHE_TTL_MS) {
    lastCandidateFactorsMeta = {
      source: "memory",
      fetchedAt: cachedFactors.fetchedAt,
    };
    return cachedFactors.items;
  }

  const persisted = await readPersistentCache();
  if (persisted && now - persisted.fetchedAt < FACTOR_CACHE_TTL_MS) {
    cachedFactors = persisted;
    lastCandidateFactorsMeta = {
      source: "disk",
      fetchedAt: persisted.fetchedAt,
    };
    return persisted.items;
  }

  if (inflightCandidateFactors) return inflightCandidateFactors;

  inflightCandidateFactors = (async () => {
    const symbols: string[] = Array.from(
      new Set(STOCK_UNIVERSE.map((s) => s.toUpperCase())),
    );

    const items = await mapWithConcurrency<
      string,
      StockCandidateFactors | null
    >(symbols, 3, async (symbol) => {
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 1);

        // biome-ignore lint/suspicious/noExplicitAny: yahoo-finance2の型が不完全
        const chartResult = await (yf as any).chart(symbol, {
          period1: startDate.toISOString().split("T")[0],
          period2: endDate.toISOString().split("T")[0],
          interval: "1wk",
        });

        const history = (chartResult?.quotes || []) as Array<{
          date: Date | string;
          close: number;
        }>;

        const closes = history
          .map((h) => toNumber(h.close))
          .filter((v): v is number => v != null);

        const returns: number[] = [];
        for (let i = 1; i < closes.length; i++) {
          const prev = closes[i - 1];
          const cur = closes[i];
          if (prev > 0) returns.push(cur / prev - 1);
        }

        const volWeekly = stddev(returns);
        const volatility = volWeekly != null ? volWeekly * Math.sqrt(52) : null;

        const last = closes.length > 0 ? closes[closes.length - 1] : null;
        const idx6m = closes.length > 26 ? closes.length - 26 : null;
        const base6m = idx6m != null ? closes[idx6m] : null;
        const momentum6m =
          last != null && base6m != null && base6m > 0
            ? last / base6m - 1
            : null;

        const idx3m = closes.length > 13 ? closes.length - 13 : null;
        const base3m = idx3m != null ? closes[idx3m] : null;
        const return3m =
          last != null && base3m != null && base3m > 0
            ? last / base3m - 1
            : null;

        const idx1m = closes.length > 5 ? closes.length - 5 : null;
        const base1m = idx1m != null ? closes[idx1m] : null;
        const return1m =
          last != null && base1m != null && base1m > 0
            ? last / base1m - 1
            : null;

        const base1y = closes.length > 1 ? closes[0] : null;
        const return1y =
          last != null && base1y != null && base1y > 0
            ? last / base1y - 1
            : null;

        // biome-ignore lint/suspicious/noExplicitAny: yahoo-finance2の型が不完全
        const summary = await (yf as any).quoteSummary(symbol, {
          modules: [
            "summaryProfile",
            "financialData",
            "defaultKeyStatistics",
            "summaryDetail",
            "quoteType",
          ],
        });

        const profile = summary?.summaryProfile;
        const financial = summary?.financialData;
        const summaryDetail = summary?.summaryDetail;
        const quoteTypeData = summary?.quoteType;

        const symbolKey = symbol.toUpperCase();
        const quoteType =
          (quoteTypeData?.quoteType as string | undefined) ||
          STOCK_MASTER_TYPE.get(symbolKey) ||
          "EQUITY";

        let sector = profile?.sector ? (profile.sector as string) : "その他";
        sector = sectorMap[sector] || sector;
        if (quoteType === "ETF") sector = "ETF";

        const name = STOCK_MASTER_NAME.get(symbolKey) || symbol;

        return {
          symbol,
          name,
          quoteType,
          sector,
          dividendYield: toNumber(summaryDetail?.dividendYield),
          per: toNumber(summaryDetail?.trailingPE),
          beta: toNumber(summaryDetail?.beta),
          roe: toNumber(financial?.returnOnEquity),
          profitMargin: toNumber(financial?.profitMargins),
          momentum6m,
          return1m,
          return3m,
          return1y,
          volatility,
        } satisfies StockCandidateFactors;
      } catch {
        return null;
      }
    });

    const valid = items.filter(
      (v): v is StockCandidateFactors =>
        v !== null && v.quoteType !== "MUTUALFUND",
    );

    cachedFactors = {
      fetchedAt: Date.now(),
      items: valid,
    };

    lastCandidateFactorsMeta = {
      source: "rebuild",
      fetchedAt: cachedFactors.fetchedAt,
    };

    await writePersistentCache(cachedFactors);
    return valid;
  })().finally(() => {
    inflightCandidateFactors = undefined;
  });

  return inflightCandidateFactors;
}

type PortfolioContext = {
  totalValue: number;
  sectorWeights: Record<string, number>;
  avgDividendYield: number;
  avgVolatility: number;
  diversificationScore: number;
};

/**
 * AI銘柄推薦システム
 * 多因子モデルに基づく高度な推薦エンジン
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const riskTolerance =
    (searchParams.get("risk") as "low" | "medium" | "high") || "medium";
  const diagnosticsEnabled = searchParams.get("diagnostics") === "1";

  try {
    await fetchCandidateFactors();

    // 現在のポートフォリオ取得と分析
    const { data: portfolios } = await supabase.from("portfolios").select("*");

    const { data: watchlist } = await supabase
      .from("watchlist")
      .select("ticker");

    let portfolioContext: PortfolioContext = {
      totalValue: 0,
      sectorWeights: {},
      avgDividendYield: 0,
      avgVolatility: 0,
      diversificationScore: 0,
    };
    const excludedTickers = new Set<string>();

    for (const w of watchlist || []) {
      const t = (w as { ticker?: string }).ticker;
      if (typeof t === "string" && t.trim() !== "") {
        excludedTickers.add(t.toUpperCase());
      }
    }

    if (portfolios && portfolios.length > 0) {
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

      portfolioContext = analyzePortfolio(rows);
      for (const row of rows) {
        excludedTickers.add(row.ticker.toUpperCase());
      }
    }

    // 高度な推薦ロジック
    const recommendations = generateAdvancedRecommendations(
      riskTolerance,
      portfolioContext,
      excludedTickers,
    );

    const uniqueRecommendations = dedupeByTicker(recommendations);

    const priceInfo = await fetchStockPricesServer(
      uniqueRecommendations.map((r) => r.ticker),
    );
    const nameMap = new Map(
      priceInfo.map((p) => [p.symbol.toUpperCase(), p.shortName]),
    );

    const enrichedRecommendations = uniqueRecommendations.map((r) => {
      const mapped = nameMap.get(r.ticker.toUpperCase());
      if (!mapped) return r;
      if (r.name && r.name !== r.ticker) return r;
      return { ...r, name: mapped };
    });

    if (diagnosticsEnabled) {
      const cacheAgeMs = cachedFactors
        ? Date.now() - cachedFactors.fetchedAt
        : null;
      const candidates = cachedFactors?.items || [];
      const eligibleCandidates = dedupeCandidates(candidates)
        .filter((c) => !excludedTickers.has(c.symbol.toUpperCase()))
        .filter((c) => c.quoteType !== "MUTUALFUND");

      return NextResponse.json({
        recommendations: enrichedRecommendations,
        diagnostics: {
          universeSize: STOCK_UNIVERSE.length,
          excludedSize: excludedTickers.size,
          candidateCount: candidates.length,
          eligibleCandidateCount: eligibleCandidates.length,
          recommendationCount: enrichedRecommendations.length,
          cacheAgeMs,
          cacheSource: lastCandidateFactorsMeta?.source || null,
          cacheFetchedAt: lastCandidateFactorsMeta?.fetchedAt || null,
          sectors: {
            eligibleCandidates: countBy(eligibleCandidates, (c) => c.sector),
            recommendations: countBy(enrichedRecommendations, (r) => r.sector),
          },
          returns: {
            eligibleCandidates: summarizeReturns(eligibleCandidates),
            recommendations: summarizeReturns(enrichedRecommendations),
          },
        },
      });
    }

    return NextResponse.json(enrichedRecommendations);
  } catch (error) {
    console.error("AI recommendations error:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 },
    );
  }
}

function analyzePortfolio(rows: PortfolioRow[]): PortfolioContext {
  const totalValue = rows.reduce((sum, r) => sum + r.currentValue, 0);
  const sectorWeights: Record<string, number> = {};

  rows.forEach((row) => {
    const sector = row.sector || "その他";
    sectorWeights[sector] =
      (sectorWeights[sector] || 0) + row.currentValue / totalValue;
  });

  const avgDividendYield =
    rows.reduce(
      (sum, r) => sum + (r.annualDividend / r.currentValue) * 100,
      0,
    ) / rows.length || 0;
  const diversificationScore = calculateDiversificationScore(rows);

  return {
    totalValue,
    sectorWeights,
    avgDividendYield,
    avgVolatility: 0.2, // 簡略化
    diversificationScore,
  };
}

function generateAdvancedRecommendations(
  riskTolerance: "low" | "medium" | "high",
  context: PortfolioContext,
  excludedTickers: Set<string>,
): Array<{
  ticker: string;
  name: string;
  reason: string;
  score: number;
  tags: string[];
  sector: string;
  breakdown: {
    weights: {
      dividend: number;
      stability: number;
      quality: number;
      momentum: number;
      value: number;
      diversity: number;
    };
    normalized: {
      dividend: number;
      stability: number;
      quality: number;
      momentum: number;
      value: number;
      diversity: number;
    };
    contributions: {
      dividend: number;
      stability: number;
      quality: number;
      momentum: number;
      value: number;
      diversity: number;
    };
    inputs: {
      dividendYield: number | null;
      per: number | null;
      beta: number | null;
      volatility: number | null;
      momentum6m: number | null;
      roe: number | null;
      profitMargin: number | null;
      portfolioSectorWeight: number;
    };
  };
  backtest: {
    return1m: number | null;
    return3m: number | null;
    return6m: number | null;
    return1y: number | null;
  };
}> {
  const weights = {
    low: {
      dividend: 0.35,
      stability: 0.25,
      quality: 0.25,
      momentum: 0.05,
      value: 0.1,
      diversity: 0.15,
    },
    medium: {
      dividend: 0.2,
      stability: 0.2,
      quality: 0.2,
      momentum: 0.25,
      value: 0.15,
      diversity: 0.15,
    },
    high: {
      dividend: 0.05,
      stability: 0.15,
      quality: 0.2,
      momentum: 0.35,
      value: 0.1,
      diversity: 0.15,
    },
  };

  const rawW = weights[riskTolerance];
  const wSum =
    rawW.dividend +
    rawW.stability +
    rawW.quality +
    rawW.momentum +
    rawW.value +
    rawW.diversity;
  const w = {
    dividend: rawW.dividend / wSum,
    stability: rawW.stability / wSum,
    quality: rawW.quality / wSum,
    momentum: rawW.momentum / wSum,
    value: rawW.value / wSum,
    diversity: rawW.diversity / wSum,
  };

  const excluded = new Set(
    Array.from(excludedTickers).map((t) => t.toUpperCase()),
  );

  const candidates = dedupeCandidates(cachedFactors?.items || [])
    .filter((c) => !excluded.has(c.symbol.toUpperCase()))
    .filter((c) => c.quoteType !== "MUTUALFUND");

  const dividendYs = candidates.map((c) => c.dividendYield);
  const perValues = candidates.map((c) => c.per);
  const betas = candidates.map((c) => c.beta);
  const vols = candidates.map((c) => c.volatility);
  const moms = candidates.map((c) => c.momentum6m);
  const roes = candidates.map((c) => c.roe);
  const margins = candidates.map((c) => c.profitMargin);

  const scored = candidates
    .filter((c) => {
      if (riskTolerance === "low") {
        if (c.volatility != null && c.volatility > 0.35) return false;
        if (c.beta != null && c.beta > 1.3) return false;
      }
      return true;
    })
    .map((c) => {
      const dividendNorm = normalizeMinMax(dividendYs, c.dividendYield);
      const perNorm = normalizeMinMax(perValues, c.per);
      const betaNorm = normalizeMinMax(betas, c.beta);
      const volNorm = normalizeMinMax(vols, c.volatility);
      const momNorm = normalizeMinMax(moms, c.momentum6m);
      const roeNorm = normalizeMinMax(roes, c.roe);
      const marginNorm = normalizeMinMax(margins, c.profitMargin);

      const qualityNorm = clamp01(0.6 * roeNorm + 0.4 * marginNorm);
      const stabilityNorm = clamp01(0.5 * (1 - volNorm) + 0.5 * (1 - betaNorm));
      const valueNorm = clamp01(1 - perNorm);

      const sectorWeight = context.sectorWeights[c.sector] || 0;
      const diversityNorm =
        sectorWeight === 0 ? 1 : sectorWeight < 0.1 ? 0.6 : 0;

      const contributions = {
        dividend: w.dividend * dividendNorm,
        stability: w.stability * stabilityNorm,
        quality: w.quality * qualityNorm,
        momentum: w.momentum * momNorm,
        value: w.value * valueNorm,
        diversity: w.diversity * diversityNorm,
      };

      const raw =
        w.dividend * dividendNorm +
        w.stability * stabilityNorm +
        w.quality * qualityNorm +
        w.momentum * momNorm +
        w.value * valueNorm +
        w.diversity * diversityNorm;

      const score = Math.round(clamp01(raw) * 100);

      const reasons: string[] = [];
      const tags: string[] = [];

      if (sectorWeight === 0) {
        reasons.push(`${c.sector}への分散`);
        tags.push("分散効果");
      }

      if (c.dividendYield != null && c.dividendYield >= 0.03) {
        reasons.push(`配当利回り${(c.dividendYield * 100).toFixed(2)}%`);
        tags.push("高配当");
      }

      if (c.momentum6m != null && c.momentum6m >= 0.12) {
        reasons.push("上昇トレンド");
        tags.push("モメンタム");
      }

      if (c.volatility != null && c.volatility <= 0.22) {
        reasons.push("価格変動が穏やか");
        tags.push("低ボラ");
      }

      if (c.per != null && c.per > 0 && c.per <= 15) {
        reasons.push("割安感");
        tags.push("バリュー");
      }

      if (qualityNorm >= 0.75) {
        reasons.push("財務品質が高い");
        tags.push("高品質");
      }

      const mainReason =
        reasons.length > 0
          ? reasons.slice(0, 2).join("、")
          : `${c.sector}セクターの${riskTolerance === "low" ? "安定" : riskTolerance === "medium" ? "バランス" : "成長"}銘柄`;

      return {
        ticker: c.symbol,
        name: c.name,
        reason: mainReason,
        score,
        tags: tags.slice(0, 3),
        sector: c.sector,
        breakdown: {
          weights: w,
          normalized: {
            dividend: dividendNorm,
            stability: stabilityNorm,
            quality: qualityNorm,
            momentum: momNorm,
            value: valueNorm,
            diversity: diversityNorm,
          },
          contributions,
          inputs: {
            dividendYield: c.dividendYield,
            per: c.per,
            beta: c.beta,
            volatility: c.volatility,
            momentum6m: c.momentum6m,
            roe: c.roe,
            profitMargin: c.profitMargin,
            portfolioSectorWeight: sectorWeight,
          },
        },
        backtest: {
          return1m: c.return1m,
          return3m: c.return3m,
          return6m: c.momentum6m,
          return1y: c.return1y,
        },
      };
    });

  scored.sort((a, b) => b.score - a.score);

  const picked: typeof scored = [];
  const counts: Record<string, number> = {};
  const maxPerSector = 2;

  for (const s of scored) {
    const sec = s.sector || "その他";
    const cur = counts[sec] || 0;
    if (cur >= maxPerSector) continue;
    picked.push(s);
    counts[sec] = cur + 1;
    if (picked.length >= 6) break;
  }

  if (picked.length < 6) {
    for (const s of scored) {
      if (picked.some((p) => p.ticker === s.ticker)) continue;
      picked.push(s);
      if (picked.length >= 6) break;
    }
  }

  return picked.slice(0, 6);
}
