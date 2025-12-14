import { TAX_RATE, TYPE_MUTUAL_FUND } from "@/lib/constants";
import type { PortfolioItem, PortfolioRow, StockPrice } from "@/types";

export const calculatePortfolioItem = (
  portfolio: PortfolioItem,
  priceData: StockPrice | undefined,
  usdjpy: number,
): PortfolioRow => {
  const currency = priceData?.currency || "JPY";
  const rawPrice = priceData?.price || 0;
  const rate = currency === "USD" ? usdjpy : 1;
  const type = priceData?.type || "EQUITY";

  const currentPriceInYen = rawPrice * rate;
  let currentValue = 0;
  let investmentInYen = 0;

  if (type === TYPE_MUTUAL_FUND) {
    currentValue = (currentPriceInYen * portfolio.shares) / 10000;
    investmentInYen =
      (portfolio.acquisition_price * rate * portfolio.shares) / 10000;
  } else {
    currentValue = currentPriceInYen * portfolio.shares;
    investmentInYen = portfolio.acquisition_price * rate * portfolio.shares;
  }

  const dividendRaw = priceData?.dividendRate || 0;
  const annualDividend =
    type === TYPE_MUTUAL_FUND
      ? (dividendRaw * rate * portfolio.shares) / 10000
      : dividendRaw * rate * portfolio.shares;

  const gainLoss = currentValue - investmentInYen;
  const isNisa = portfolio.account_type?.includes("nisa");
  let afterTaxGain = gainLoss;
  if (!isNisa && gainLoss > 0) {
    afterTaxGain = gainLoss * (1 - TAX_RATE);
  }

  return {
    ...portfolio,
    currency,
    originalPrice: rawPrice,
    currentPrice: currentPriceInYen,
    currentValue,
    investmentValue: investmentInYen,
    gainLoss,
    gainLossPercent:
      investmentInYen !== 0 ? (gainLoss / investmentInYen) * 100 : 0,
    name: priceData?.shortName || portfolio.ticker,
    annualDividend,
    afterTaxGain,
    type,
    sector: priceData?.sector,
    quoteType: priceData?.quoteType,
  } as PortfolioRow;
};
