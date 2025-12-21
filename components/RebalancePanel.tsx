// components/RebalancePanel.tsx
"use client";

import BalanceIcon from "@mui/icons-material/Balance";
import SellIcon from "@mui/icons-material/Sell";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Slider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import type { RebalanceProposal } from "@/types";
import { useToast } from "./Toast";

// 全セクターリスト（日本株の主要セクター）
const ALL_SECTORS = [
  "テクノロジー",
  "金融",
  "ヘルスケア",
  "一般消費財",
  "生活必需品",
  "資本財",
  "エネルギー",
  "素材",
  "通信",
  "公共事業",
  "不動産",
  "ETF",
  "投資信託",
  "その他",
];

export default function RebalancePanel() {
  const [allocation, setAllocation] = useState<Record<string, number>>({});
  const [proposals, setProposals] = useState<RebalanceProposal[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const { showError } = useToast();

  // 現在のポートフォリオからセクター情報を取得
  const { data: currentSectors } = useSWR<Record<string, number>>(
    "portfolio-sectors",
    () => api.fetchPortfolioSectors(),
    { revalidateOnFocus: false },
  );

  // セクター情報が取得できたら配分を初期化（全セクターを含む）
  useEffect(() => {
    if (currentSectors && !initialized) {
      const totalValue = Object.values(currentSectors).reduce(
        (s, v) => s + v,
        0,
      );

      // 全セクターを含む配分を作成
      const percentages: Record<string, number> = {};

      // まず全セクターを0%で初期化
      for (const sector of ALL_SECTORS) {
        percentages[sector] = 0;
      }

      // 現在保有しているセクターの配分を計算
      if (totalValue > 0) {
        for (const [sector, value] of Object.entries(currentSectors)) {
          percentages[sector] = Math.round((value / totalValue) * 100);
        }
      }

      // 合計が100になるよう調整（保有セクターのみで調整）
      const currentTotal = Object.values(percentages).reduce(
        (s, v) => s + v,
        0,
      );
      if (currentTotal !== 100 && currentTotal > 0) {
        const heldSectors = Object.keys(currentSectors);
        if (heldSectors.length > 0) {
          percentages[heldSectors[0]] += 100 - currentTotal;
        }
      } else if (currentTotal === 0) {
        // 何も保有していない場合はバランス型で初期化
        percentages.ETF = 30;
        percentages.投資信託 = 30;
        percentages.テクノロジー = 20;
        percentages.金融 = 20;
      }

      setAllocation(percentages);
      setInitialized(true);
    }
  }, [currentSectors, initialized]);

  const totalPercent = Object.values(allocation).reduce((sum, v) => sum + v, 0);

  const handleSliderChange = (sector: string, value: number) => {
    setAllocation((prev) => ({
      ...prev,
      [sector]: value,
    }));
  };

  const handleAnalyze = async () => {
    if (totalPercent !== 100) {
      showError("配分の合計が100%になるよう調整してください");
      return;
    }

    setLoading(true);
    try {
      const result = await api.fetchRebalanceProposal(allocation);
      setProposals(result);
    } catch {
      showError("リバランス分析に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <BalanceIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">
            リバランス提案
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" mb={2}>
          目標配分を設定して、最適なリバランスを計算します
        </Typography>

        <Box sx={{ mb: 3, maxHeight: 400, overflow: "auto" }}>
          {Object.entries(allocation).map(([sector, value]) => {
            const currentValue = currentSectors?.[sector] || 0;
            const totalValue = currentSectors
              ? Object.values(currentSectors).reduce((s, v) => s + v, 0)
              : 0;
            const currentPercent =
              totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
            const isHeld = currentPercent > 0;

            return (
              <Box
                key={sector}
                sx={{
                  mb: 1.5,
                  p: 1,
                  borderRadius: 1,
                  bgcolor: isHeld ? "action.hover" : "transparent",
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2">{sector}</Typography>
                    {isHeld && (
                      <Chip
                        label={`現在 ${currentPercent.toFixed(0)}%`}
                        size="small"
                        variant="outlined"
                        color="primary"
                        sx={{ height: 20, fontSize: "0.7rem" }}
                      />
                    )}
                  </Box>
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    color={value > 0 ? "primary.main" : "text.secondary"}
                  >
                    目標 {value}%
                  </Typography>
                </Box>
                <Slider
                  value={value}
                  onChange={(_, newValue) =>
                    handleSliderChange(sector, newValue as number)
                  }
                  min={0}
                  max={60}
                  step={5}
                  size="small"
                  sx={{
                    "& .MuiSlider-track": {
                      bgcolor: isHeld ? "primary.main" : "grey.500",
                    },
                  }}
                />
              </Box>
            );
          })}
          <Box
            display="flex"
            justifyContent="space-between"
            sx={{
              pt: 1,
              borderTop: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="body2">合計</Typography>
            <Typography
              variant="body2"
              fontWeight="bold"
              color={totalPercent === 100 ? "success.main" : "error.main"}
            >
              {totalPercent}%
            </Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          fullWidth
          onClick={handleAnalyze}
          disabled={loading || totalPercent !== 100}
          sx={{ mb: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : "リバランスを計算"}
        </Button>

        {proposals && proposals.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>セクター</TableCell>
                  <TableCell align="center">アクション</TableCell>
                  <TableCell align="right">金額</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {proposals.map((proposal) => (
                  <TableRow key={proposal.ticker}>
                    <TableCell>
                      <Typography variant="body2">{proposal.ticker}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        現在 {proposal.currentWeight.toFixed(1)}% → 目標{" "}
                        {proposal.targetWeight.toFixed(1)}%
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        icon={
                          proposal.action === "buy" ? (
                            <ShoppingCartIcon />
                          ) : (
                            <SellIcon />
                          )
                        }
                        label={proposal.action === "buy" ? "買い" : "売り"}
                        size="small"
                        color={proposal.action === "buy" ? "success" : "error"}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color={
                          proposal.action === "buy"
                            ? "success.main"
                            : "error.main"
                        }
                      >
                        ¥{Math.round(proposal.amount).toLocaleString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {proposals && proposals.length === 0 && (
          <Typography color="text.secondary" align="center" py={2}>
            現在の配分は目標に近いため、リバランスは不要です
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
