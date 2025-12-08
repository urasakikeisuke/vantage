// components/BuyMoreDialog.tsx
"use client";

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { logOperation } from "@/lib/logger";
import { createClient } from "@/lib/supabase/client"; // 修正

// ... (以下、createClient() を使う以外は以前と同じロジック)

type TargetItem = {
  id: string;
  ticker: string;
  currentShares: number;
  currentPrice: number;
} | null;

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetItem: TargetItem;
};

export default function BuyMoreDialog({
  open,
  onClose,
  onSuccess,
  targetItem,
}: Props) {
  const [addedShares, setAddedShares] = useState("");
  const [amountValue, setAmountValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"price" | "total">("total");

  const supabase = createClient(); // クライアント作成

  useEffect(() => {
    if (open) {
      setAddedShares("");
      setAmountValue("");
      setMode("total");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!targetItem || !addedShares || !amountValue) return;
    setLoading(true);

    const addS = Number(addedShares);
    const inputVal = Number(amountValue);
    const currentTotal = targetItem.currentShares * targetItem.currentPrice;

    let newShares = 0;
    let newTotal = 0;

    if (mode === "price") {
      const addP = inputVal;
      const addedTotal = addS * addP;
      newShares = targetItem.currentShares + addS;
      newTotal = currentTotal + addedTotal;
    } else {
      const addedTotal = inputVal;
      newShares = targetItem.currentShares + addS;
      newTotal = currentTotal + addedTotal;
    }

    const newAveragePrice = newTotal / newShares;

    await logOperation(
      targetItem.id,
      "buy_more",
      targetItem.ticker,
      `買い増し: +${addS}株 (計${newShares}株)`,
      {
        shares: targetItem.currentShares,
        acquisition_price: targetItem.currentPrice,
      },
      {
        shares: newShares,
        acquisition_price: newAveragePrice,
      },
    );

    const { error } = await supabase
      .from("portfolios")
      .update({
        shares: newShares,
        acquisition_price: newAveragePrice,
      })
      .eq("id", targetItem.id);

    setLoading(false);

    if (error) {
      alert(`エラーが発生しました: ${error.message}`);
    } else {
      onSuccess();
      onClose();
    }
  };

  const simulatePrice = () => {
    // ... (シミュレーションロジックはそのまま)
    if (!targetItem || !addedShares || !amountValue) return 0;
    const addS = Number(addedShares);
    const inputVal = Number(amountValue);
    const currentTotal = targetItem.currentShares * targetItem.currentPrice;
    let finalTotal = 0;
    if (mode === "price") finalTotal = currentTotal + addS * inputVal;
    else finalTotal = currentTotal + inputVal;
    return finalTotal / (targetItem.currentShares + addS);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>買い増し登録</DialogTitle>
      <DialogContent>
        {/* ... (UI部分は以前と同じ) */}
        <DialogContentText sx={{ mb: 2 }}>
          {targetItem?.ticker}
        </DialogContentText>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_e, newMode) => {
              if (newMode) setMode(newMode);
            }}
            size="small"
            color="primary"
          >
            <ToggleButton value="total">金額指定 (積立)</ToggleButton>
            <ToggleButton value="price">単価指定 (通常)</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <TextField
          autoFocus
          margin="dense"
          label="購入株数 (口数)"
          type="number"
          fullWidth
          variant="outlined"
          value={addedShares}
          onChange={(e) => setAddedShares(e.target.value)}
          placeholder="例: 1.234"
          slotProps={{ htmlInput: { step: "any" } }}
        />
        <TextField
          margin="dense"
          label={mode === "total" ? "購入総額 (円)" : "購入単価 (円/株)"}
          type="number"
          fullWidth
          variant="outlined"
          value={amountValue}
          onChange={(e) => setAmountValue(e.target.value)}
          placeholder={mode === "total" ? "例: 10000" : "例: 2450"}
          slotProps={{ htmlInput: { step: "any" } }}
          helperText={
            mode === "total"
              ? "支払った合計金額を入力"
              : "1株あたりの約定価格を入力"
          }
        />
        {targetItem && addedShares && amountValue && (
          <Box
            sx={{ mt: 2, p: 1, bgcolor: "background.default", borderRadius: 1 }}
          >
            <Typography variant="caption" sx={{ display: "block" }}>
              現在: {targetItem.currentShares}株 (平均 ¥
              {Math.round(targetItem.currentPrice).toLocaleString()})
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: "bold", color: "primary.main", mt: 0.5 }}
            >
              更新後平均: ¥{Math.round(simulatePrice()).toLocaleString()}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          キャンセル
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          決定
        </Button>
      </DialogActions>
    </Dialog>
  );
}
