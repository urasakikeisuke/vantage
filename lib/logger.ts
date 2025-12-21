// lib/logger.ts
import { createClient } from "@/lib/supabase/client";

export type OperationType = "add" | "edit" | "delete" | "buy_more" | "sell";

export const logOperation = async (
  portfolioId: string | null,
  operationType: OperationType,
  ticker: string,
  details: string,
  previousData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null,
) => {
  const supabase = createClient();

  const { error } = await supabase.from("operation_logs").insert([
    {
      portfolio_id: portfolioId,
      operation_type: operationType,
      ticker: ticker,
      details: details,
      previous_data: previousData,
      new_data: newData,
    },
  ]);

  if (error) {
    console.error("Failed to save log:", error);
  }
};
