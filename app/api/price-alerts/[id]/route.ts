// app/api/price-alerts/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as {
      alert_type?: "above" | "below";
      target_price?: number;
      is_active?: boolean;
    } | null;

    const alert_type = body?.alert_type;
    const target_price = body?.target_price;
    const is_active = body?.is_active;

    const update: {
      alert_type?: "above" | "below";
      target_price?: number;
      is_active?: boolean;
      triggered_at?: string | null;
    } = {};

    const hasAlertType = alert_type !== undefined;
    const hasTargetPrice = target_price !== undefined;
    const hasIsActive = typeof is_active === "boolean";

    if (!hasAlertType && !hasTargetPrice && !hasIsActive) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (hasAlertType || hasTargetPrice) {
      if (alert_type !== "above" && alert_type !== "below") {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 },
        );
      }

      if (typeof target_price !== "number" || Number.isNaN(target_price)) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 },
        );
      }

      update.alert_type = alert_type;
      update.target_price = target_price;
    }

    if (hasIsActive) {
      update.is_active = is_active;
      if (is_active) update.triggered_at = null;
    }

    const { data, error } = await supabase
      .from("price_alerts")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Price alert update error:", error);
    return NextResponse.json(
      { error: "Failed to update price alert" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { error } = await supabase
      .from("price_alerts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Price alert delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete price alert" },
      { status: 500 },
    );
  }
}
