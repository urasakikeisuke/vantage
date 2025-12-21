// components/SellDialog.tsx
"use client";

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { logOperation } from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "./Toast";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetItem: {
    id: string;
    ticker: string;
    name: string;
    currentShares: number;
    currentPrice: number;
    acquisitionPrice: number;
    accountType: string;
  } | null;
};

export default function SellDialog({
  open,
  onClose,
  onSuccess,
  targetItem,
}: Props) {
  const [sellShares, setSellShares] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [fee, setFee] = useState("");
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();
  const supabase = createClient();

  const handleClose = () => {
    setSellShares("");
    setSellPrice("");
    setFee("");
    onClose();
  };

  const sellSharesNum = parseFloat(sellShares) || 0;
  const sellPriceNum = parseFloat(sellPrice) || targetItem?.currentPrice || 0;
  const feeNum = parseFloat(fee) || 0;
  const totalAmount = sellSharesNum * sellPriceNum - feeNum;

  // 損益計算
  const costBasis = sellSharesNum * (targetItem?.acquisitionPrice || 0);
  const grossProfit = sellSharesNum * sellPriceNum - costBasis;
  const taxRate = targetItem?.accountType?.startsWith("nisa") ? 0 : 0.20315;
  const tax = grossProfit > 0 ? grossProfit * taxRate : 0;
  const netProfit = grossProfit - tax - feeNum;

  const handleSubmit = async () => {
    if (!targetItem || sellSharesNum <= 0) return;
    if (sellSharesNum > targetItem.currentShares) {
      showError("売却数量が保有数量を超えています");
      return;
    }

    setLoading(true);
    try {
      const remainingShares = targetItem.currentShares - sellSharesNum;

      if (remainingShares === 0) {
        // 全売却: ポートフォリオから削除
        const { error } = await supabase
          .from("portfolios")
          .delete()
          .eq("id", targetItem.id);
        if (error) throw error;
      } else {
        // 部分売却: 株数を更新
        const { error } = await supabase
          .from("portfolios")
          .update({ shares: remainingShares })
          .eq("id", targetItem.id);
        if (error) throw error;
      }

      // 取引履歴に記録
      await supabase.from("transactions").insert([
        {
          portfolio_id: remainingShares > 0 ? targetItem.id : null,
          ticker: targetItem.ticker,
          transaction_type: "sell",
          shares: sellSharesNum,
          price: sellPriceNum,
          fee: feeNum,
          total_amount: totalAmount,
          transaction_date: new Date().toISOString().split("T")[0],
          notes: `売却損益: ¥${netProfit.toLocaleString()}`,
        },
      ]);

      // 操作ログ
      await logOperation(
        targetItem.id,
        "sell",
        targetItem.ticker,
        `${sellSharesNum}株を¥${sellPriceNum.toLocaleString()}で売却`,
        {
          shares: targetItem.currentShares,
          acquisition_price: targetItem.acquisitionPrice,
        },
        {
          shares: remainingShares,
          sold_shares: sellSharesNum,
          sell_price: sellPriceNum,
          profit: netProfit,
        },
      );

      showSuccess(
        `${targetItem.name}を${sellSharesNum}株売却しました（損益: ¥${netProfit.toLocaleString()}）`,
      );
      handleClose();
      onSuccess();
    } catch (error) {
      console.error("Sell error:", error);
      showError("売却に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  if (!targetItem) return null;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>株式売却</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {targetItem.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {targetItem.ticker}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              保有数量
            </Typography>
            <Typography variant="body1">
              {targetItem.currentShares.toLocaleString()}株
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              現在価格
            </Typography>
            <Typography variant="body1">
              ¥{targetItem.currentPrice.toLocaleString()}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              取得単価
            </Typography>
            <Typography variant="body1">
              ¥{targetItem.acquisitionPrice.toLocaleString()}
            </Typography>
          </Box>
        </Box>

        <TextField
          label="売却数量"
          type="number"
          fullWidth
          value={sellShares}
          onChange={(e) => setSellShares(e.target.value)}
          InputProps={{
            endAdornment: <InputAdornment position="end">株</InputAdornment>,
          }}
          sx={{ mb: 2 }}
          helperText={`最大: ${targetItem.currentShares}株`}
        />

        <TextField
          label="売却単価"
          type="number"
          fullWidth
          value={sellPrice}
          onChange={(e) => setSellPrice(e.target.value)}
          placeholder={targetItem.currentPrice.toString()}
          InputProps={{
            startAdornment: <InputAdornment position="start">¥</InputAdornment>,
          }}
          sx={{ mb: 2 }}
        />

        <TextField
          label="手数料"
          type="number"
          fullWidth
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start">¥</InputAdornment>,
          }}
          sx={{ mb: 3 }}
        />

        {sellSharesNum > 0 && (
          <Box
            sx={{
              p: 2,
              bgcolor: "background.paper",
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="subtitle2" gutterBottom>
              売却シミュレーション
            </Typography>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                売却金額
              </Typography>
              <Typography variant="body2">
                ¥{(sellSharesNum * sellPriceNum).toLocaleString()}
              </Typography>
            </Box>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                取得原価
              </Typography>
              <Typography variant="body2">
                ¥{costBasis.toLocaleString()}
              </Typography>
            </Box>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                売却損益
              </Typography>
              <Typography
                variant="body2"
                color={grossProfit >= 0 ? "success.main" : "error.main"}
              >
                {grossProfit >= 0 ? "+" : ""}¥{grossProfit.toLocaleString()}
              </Typography>
            </Box>
            {tax > 0 && (
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" color="text.secondary">
                  税金 (20.315%)
                </Typography>
                <Typography variant="body2" color="error.main">
                  -¥{Math.round(tax).toLocaleString()}
                </Typography>
              </Box>
            )}
            {feeNum > 0 && (
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" color="text.secondary">
                  手数料
                </Typography>
                <Typography variant="body2" color="error.main">
                  -¥{feeNum.toLocaleString()}
                </Typography>
              </Box>
            )}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                pt: 1,
                borderTop: 1,
                borderColor: "divider",
              }}
            >
              <Typography variant="body1" fontWeight="bold">
                税引後損益
              </Typography>
              <Typography
                variant="body1"
                fontWeight="bold"
                color={netProfit >= 0 ? "success.main" : "error.main"}
              >
                {netProfit >= 0 ? "+" : ""}¥
                {Math.round(netProfit).toLocaleString()}
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="inherit">
          キャンセル
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="error"
          disabled={
            loading ||
            sellSharesNum <= 0 ||
            sellSharesNum > targetItem.currentShares
          }
        >
          売却する
        </Button>
      </DialogActions>
    </Dialog>
  );
}
