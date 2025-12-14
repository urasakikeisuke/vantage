import type { StockDetailData, StockPrice } from "@/types";

export const api = {
  searchStocks: async (query: string) => {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("Failed to search stocks");
    return res.json();
  },

  fetchStockDetail: async (
    symbol: string,
    range: string,
  ): Promise<StockDetailData> => {
    const res = await fetch(
      `/api/stock-detail?symbol=${symbol}&range=${range}`,
    );
    if (!res.ok) throw new Error("Failed to fetch stock detail");
    return res.json();
  },

  fetchStockPrices: async (symbols: string): Promise<StockPrice[]> => {
    const res = await fetch(`/api/stocks?symbols=${symbols}`);
    if (!res.ok) throw new Error("Failed to fetch stock prices");
    return res.json();
  },
};
