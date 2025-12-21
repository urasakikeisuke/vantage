// app/api/price-alerts/route.ts
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
    const { data: alerts, error } = await supabase
      .from("price_alerts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(alerts || []);
  } catch (error) {
    console.error("Price alerts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch price alerts" },
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
    const { ticker, alert_type, target_price } = body;

    if (!ticker || !alert_type || !target_price) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("price_alerts")
      .insert([
        {
          user_id: user.id,
          ticker: ticker.toUpperCase(),
          alert_type,
          target_price,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Price alert create error:", error);
    return NextResponse.json(
      { error: "Failed to create price alert" },
      { status: 500 },
    );
  }
}
