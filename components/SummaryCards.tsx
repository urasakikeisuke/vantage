// components/SummaryCards.tsx
"use client";

import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PaidIcon from "@mui/icons-material/Paid";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { Box, Card, CardContent, Grid, Paper, Typography } from "@mui/material";

type Props = {
  totalValue: number;
  totalInvestment: number;
  totalDividend: number;
  stockInvestment: number; // 追加: 株式のみの投資元本
};

export default function SummaryCards({
  totalValue,
  totalInvestment,
  totalDividend,
  stockInvestment,
}: Props) {
  const totalGainLoss = totalValue - totalInvestment;
  const totalGainLossPercent =
    totalInvestment !== 0 ? (totalGainLoss / totalInvestment) * 100 : 0;
  const isPositive = totalGainLoss >= 0;

  // 修正: 株式のみの元本を分母にして利回りを計算
  const dividendYield =
    stockInvestment !== 0 ? (totalDividend / stockInvestment) * 100 : 0;

  return (
    <Paper
      elevation={0}
      sx={(theme) => ({
        p: { xs: 0, sm: 3 },
        mb: 4,
        bgcolor: { xs: "transparent", sm: "background.paper" },
        borderRadius: { xs: 0, sm: 2 },
        boxShadow: { xs: "none", sm: theme.shadows[3] },
      })}
    >
      <Grid container spacing={2}>
        {/* 1. 総資産額 */}
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card
            sx={{
              height: "100%",
              bgcolor: "background.paper",
              borderRadius: 2,
            }}
          >
            <CardContent sx={{ py: 2, px: 2, "&:last-child": { pb: 2 } }}>
              <Box display="flex" alignItems="center" mb={0.5}>
                <AccountBalanceWalletIcon
                  color="primary"
                  sx={{ mr: 1, fontSize: 20 }}
                />
                <Typography color="text.secondary" variant="body2">
                  総資産額
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight="bold">
                ¥{totalValue.toLocaleString()}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block" }}
              >
                元本: ¥{totalInvestment.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 2. 評価損益 */}
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card
            sx={{
              height: "100%",
              bgcolor: "background.paper",
              borderRadius: 2,
            }}
          >
            <CardContent sx={{ py: 2, px: 2, "&:last-child": { pb: 2 } }}>
              <Box display="flex" alignItems="center" mb={0.5}>
                {isPositive ? (
                  <TrendingUpIcon
                    color="success"
                    sx={{ mr: 1, fontSize: 20 }}
                  />
                ) : (
                  <TrendingDownIcon
                    color="error"
                    sx={{ mr: 1, fontSize: 20 }}
                  />
                )}
                <Typography color="text.secondary" variant="body2">
                  評価損益
                </Typography>
              </Box>
              <Typography
                variant="h5"
                fontWeight="bold"
                color={isPositive ? "success.main" : "error.main"}
              >
                {isPositive ? "+" : ""}¥
                {Math.round(totalGainLoss).toLocaleString()}
              </Typography>
              <Typography
                variant="caption"
                color={isPositive ? "success.main" : "error.main"}
                sx={{ display: "block" }}
              >
                {isPositive ? "+" : ""}
                {totalGainLossPercent.toFixed(2)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 3. 年間配当金 (予想) */}
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card
            sx={{
              height: "100%",
              bgcolor: "background.paper",
              borderRadius: 2,
            }}
          >
            <CardContent sx={{ py: 2, px: 2, "&:last-child": { pb: 2 } }}>
              <Box display="flex" alignItems="center" mb={0.5}>
                <PaidIcon color="secondary" sx={{ mr: 1, fontSize: 20 }} />
                <Typography color="text.secondary" variant="body2">
                  年間配当金 (予想)
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight="bold" color="secondary.main">
                ¥{Math.round(totalDividend).toLocaleString()}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block" }}
              >
                利回り(簿価): {dividendYield.toFixed(2)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
}
