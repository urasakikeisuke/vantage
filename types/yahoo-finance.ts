// types/yahoo-finance.ts
// Yahoo Finance API の型定義

export interface ChartOptions {
  period1: string;
  period2: string;
  interval: "1d" | "1wk" | "1mo";
}

export interface ChartQuote {
  date: Date | string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

export interface ChartResult {
  quotes: ChartQuote[];
  meta?: {
    symbol: string;
    currency: string;
    regularMarketPrice: number;
  };
}

export interface SummaryProfile {
  sector?: string;
  industry?: string;
  longBusinessSummary?: string;
  website?: string;
  employees?: number;
}

export interface FinancialData {
  returnOnEquity?: number;
  returnOnAssets?: number;
  profitMargins?: number;
  revenueGrowth?: number;
  operatingMargins?: number;
}

export interface DefaultKeyStatistics {
  trailingEps?: number;
  priceToBook?: number;
  enterpriseValue?: number;
  sharesOutstanding?: number;
}

export interface SummaryDetail {
  trailingPE?: number;
  dividendYield?: number;
  marketCap?: number;
  beta?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
}

export interface QuoteTypeData {
  quoteType?: string;
  exchange?: string;
  shortName?: string;
  longName?: string;
}

export interface QuoteSummary {
  summaryProfile?: SummaryProfile;
  financialData?: FinancialData;
  defaultKeyStatistics?: DefaultKeyStatistics;
  summaryDetail?: SummaryDetail;
  quoteType?: QuoteTypeData;
}

export interface SummaryOptions {
  modules: string[];
}

export interface QuoteOptions {
  lang?: string;
  region?: string;
}

export interface Quote {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  currency?: string;
  longName?: string;
  shortName?: string;
  trailingAnnualDividendRate?: number;
  dividendRate?: number;
  quoteType?: string;
  ask?: number;
  bid?: number;
}
