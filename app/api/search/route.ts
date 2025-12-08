// app/api/search/route.ts
import { NextResponse } from "next/server";
// 作成したJSONデータをインポート
import stockData from "@/data/jp_stocks.json";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ options: [] });
  }

  try {
    const lowerQuery = query.toLowerCase();

    // コード(symbol) または 名前(name) に入力値が含まれているものを探す
    const options = stockData.filter((stock) => {
      return (
        stock.symbol.toLowerCase().includes(lowerQuery) ||
        stock.name.toLowerCase().includes(lowerQuery)
      );
    });

    return NextResponse.json({ options });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ options: [] });
  }
}
