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
  // 以下追加
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
  // 以下追加
  sector?: string;
  quoteType?: string;
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
