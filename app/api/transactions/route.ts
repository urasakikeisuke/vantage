// app/api/transactions/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("*")
      .order("transaction_date", { ascending: false });

    if (error) throw error;

    return NextResponse.json(transactions || []);
  } catch (error) {
    console.error("Transactions fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      portfolio_id,
      ticker,
      transaction_type,
      shares,
      price,
      fee,
      total_amount,
      transaction_date,
      notes,
    } = body;

    if (
      !ticker ||
      !transaction_type ||
      !shares ||
      !price ||
      !transaction_date
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert([
        {
          user_id: user.id,
          portfolio_id,
          ticker: ticker.toUpperCase(),
          transaction_type,
          shares,
          price,
          fee: fee || 0,
          total_amount: total_amount || shares * price + (fee || 0),
          transaction_date,
          notes,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Transaction add error:", error);
    return NextResponse.json(
      { error: "Failed to add transaction" },
      { status: 500 },
    );
  }
}
