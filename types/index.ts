// types/index.ts

export type PortfolioItem = {
  id: string;
  ticker: string;
  shares: number;
  acquisition_price: number;
  account_type: string;
  is_locked: boolean;
};

export type StockPrice = {
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

export type PortfolioRow = PortfolioItem & {
  currentPrice: number;
  originalPrice: number;
  currentValue: number;
  investmentValue: number;
  gainLoss: number;
  gainLossPercent: number;
  name: string;
  currency: string;
  annualDividend: number;
  afterTaxGain: number;
  type?: string;
  sector?: string;
  quoteType?: string;
};

export type PortfolioData = {
  rows: PortfolioRow[];
  totalValue: number;
  totalInvestment: number;
  totalStockInvestment: number;
  totalDividend: number;
  exchangeRate: number | null;
};

export type HistoryData = {
  date: string;
  total_value: number;
  total_investment: number;
};

export type GroupedPortfolio = {
  ticker: string;
  name: string;
  totalShares: number;
  averageAcquisitionPrice: number;
  totalCurrentValue: number;
  totalInvestmentValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  totalAnnualDividend: number;
  totalAfterTaxGain: number;
  currentPrice: number;
  currency: string;
  type: string;
  items: PortfolioRow[];
};

export type StockDetailData = {
  history: { date: string; close: number }[];
  details: {
    quoteType: string;
    sector: string;
    industry: string;
    roe: number | null;
    roa: number | null;
    per: number | null;
    pbr: number | null;
    dividendYield: number | null;
    marketCap: number | null;
    eps: number | null;
    profitMargin: number | null;
    beta: number | null;
  };
};

// 新規追加: ウォッチリスト
export type WatchlistItem = {
  id: string;
  ticker: string;
  target_price: number | null;
  notes: string | null;
  currentPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  name?: string;
};

// 新規追加: 価格アラート
export type PriceAlert = {
  id: string;
  ticker: string;
  alert_type: "above" | "below";
  target_price: number;
  is_active: boolean;
  triggered_at: string | null;
};

// 新規追加: 取引履歴
export type Transaction = {
  id: string;
  portfolio_id: string;
  ticker: string;
  transaction_type: "buy" | "sell";
  shares: number;
  price: number;
  fee: number;
  total_amount: number;
  transaction_date: string;
  notes: string | null;
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};

export type DiversificationBreakdown = {
  score: number;
  weights: { sector: number; ticker: number; currency: number; type: number };
  axes: {
    sector: {
      score: number;
      count: number;
      top: Array<{ name: string; percent: number }>;
    };
    ticker: {
      score: number;
      count: number;
      top: Array<{ name: string; percent: number }>;
    };
    currency: {
      score: number;
      count: number;
      top: Array<{ name: string; percent: number }>;
    };
    type: {
      score: number;
      count: number;
      top: Array<{ name: string; percent: number }>;
    };
  };
};

// 新規追加: ポートフォリオ分析
export type PortfolioAnalysis = {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  beta: number;
  alpha: number;
  diversificationScore: number;
  diversificationBreakdown?: DiversificationBreakdown;
  estimatedDividend: number;
  dividendYield: number;
};

// 新規追加: リバランス提案
export type RebalanceProposal = {
  ticker: string;
  currentWeight: number;
  targetWeight: number;
  action: "buy" | "sell" | "hold";
  shares: number;
  amount: number;
};
