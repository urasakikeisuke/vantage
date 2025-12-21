// components/AnalysisPanel.tsx
"use client";

import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import useSWR from "swr";
import { api } from "@/lib/api";
import type { PortfolioAnalysis } from "@/types";

export default function AnalysisPanel() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"), {
    noSsr: true,
  });
  const { data: analysis, isLoading } = useSWR<PortfolioAnalysis>(
    "portfolio-analysis",
    () => api.fetchPortfolioAnalysis(),
    { revalidateOnFocus: false },
  );

  if (isLoading) {
    return (
      <Paper
        elevation={isMobile ? 0 : 3}
        sx={{
          p: isMobile ? 0 : 3,
          mb: 4,
          bgcolor: isMobile ? "transparent" : "background.paper",
          borderRadius: isMobile ? 0 : 2,
          boxShadow: isMobile ? "none" : undefined,
        }}
      >
        <Box display="flex" justifyContent="center" p={2}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  if (!analysis) {
    return (
      <Paper
        elevation={isMobile ? 0 : 3}
        sx={{
          p: isMobile ? 0 : 3,
          mb: 4,
          bgcolor: isMobile ? "transparent" : "background.paper",
          borderRadius: isMobile ? 0 : 2,
          boxShadow: isMobile ? "none" : undefined,
        }}
      >
        <Typography color="text.secondary" align="center">
          分析データを取得できませんでした
        </Typography>
      </Paper>
    );
  }

  const metrics = [
    {
      label: "総リターン",
      value: `${(analysis.totalReturn * 100).toFixed(2)}%`,
      color: analysis.totalReturn >= 0 ? "success.main" : "error.main",
      icon:
        analysis.totalReturn >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />,
      tooltip:
        "📈 投資した金額に対して、今いくら増えた（減った）かを示します。例: 100万円投資して110万円になったら+10%です。",
    },
    {
      label: "年率換算リターン",
      value: `${(analysis.annualizedReturn * 100).toFixed(2)}%`,
      color: analysis.annualizedReturn >= 0 ? "success.main" : "error.main",
      icon:
        analysis.annualizedReturn >= 0 ? (
          <TrendingUpIcon />
        ) : (
          <TrendingDownIcon />
        ),
      tooltip:
        "📅 1年間続けた場合の予想リターンです。短期間の結果を1年に換算した数値なので、参考程度にご覧ください。",
    },
    {
      label: "ボラティリティ",
      value: `${(analysis.volatility * 100).toFixed(2)}%`,
      color: "text.primary",
      tooltip:
        "🎢 価格の上下動の激しさを表します。数値が高いほど値動きが大きくリスクが高い傾向にあります。低いほど安定しています。",
    },
    {
      label: "シャープレシオ",
      value: analysis.sharpeRatio.toFixed(2),
      color: "text.primary",
      tooltip:
        "⚖️ リスクに対してどれだけ効率的にリターンを得ているかを示します。1以上なら優秀、2以上なら非常に優秀とされます。",
    },
    {
      label: "最大ドローダウン",
      value: `${(analysis.maxDrawdown * 100).toFixed(2)}%`,
      color: "error.main",
      tooltip:
        "📉 過去の最高値からどれだけ下落したかを示します。例: 10%なら、最高値100万円から90万円まで下がった経験があるということです。",
    },
    {
      label: "ベータ値",
      value: analysis.beta.toFixed(2),
      color: "text.primary",
      tooltip:
        "🔗 市場全体と比べた値動きの大きさです。1なら市場と同じ動き、1より大きいと市場より激しく動き、1より小さいと穏やかです。",
    },
  ];

  const breakdown = analysis.diversificationBreakdown;

  const suggestions = (() => {
    if (!breakdown) return [] as string[];
    const list: string[] = [];

    const top = {
      sector: breakdown.axes.sector.top[0],
      ticker: breakdown.axes.ticker.top[0],
      currency: breakdown.axes.currency.top[0],
      type: breakdown.axes.type.top[0],
    };

    if (breakdown.axes.ticker.score < 50 && top.ticker?.percent >= 35) {
      list.push(
        `銘柄が集中しています（最大: ${top.ticker.name} ${top.ticker.percent.toFixed(1)}%）。他の銘柄やインデックスを組み合わせると改善します。`,
      );
    }
    if (breakdown.axes.sector.score < 55 && top.sector?.percent >= 40) {
      list.push(
        `セクターが偏っています（最大: ${top.sector.name} ${top.sector.percent.toFixed(1)}%）。異なるセクター（例: 金融/ヘルスケア/生活必需品など）を追加すると改善します。`,
      );
    }
    if (breakdown.axes.currency.score < 60 && top.currency?.percent >= 80) {
      list.push(
        `通貨が偏っています（最大: ${top.currency.name} ${top.currency.percent.toFixed(1)}%）。為替リスクを分散したい場合は他通貨建て資産も検討してください。`,
      );
    }
    if (breakdown.axes.type.score < 50 && top.type?.percent >= 90) {
      list.push(
        `資産タイプが偏っています（最大: ${top.type.name} ${top.type.percent.toFixed(1)}%）。ETF/投資信託などを組み合わせると分散しやすいです。`,
      );
    }

    if (list.length === 0) {
      list.push(
        "大きな偏りは見当たりません。方針（配当重視/成長重視/リスク許容度）に合わせて、少しずつリバランスするとより安定します。",
      );
    }
    return list;
  })();

  const axisLabel = {
    sector: "セクター",
    ticker: "銘柄",
    currency: "通貨",
    type: "種別",
  } as const;

  const axisDescription = {
    sector: "業種の偏り（例: テクノロジーに集中していないか）",
    ticker: "個別銘柄の集中（1銘柄が大きすぎないか）",
    currency: "為替リスクの集中（JPY/USDなど）",
    type: "株式/ETF/投資信託などの偏り",
  } as const;

  const renderTopChips = (top: Array<{ name: string; percent: number }>) => {
    if (!top || top.length === 0) return null;
    return (
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
        {top.map((t) => (
          <Chip
            key={t.name}
            size="small"
            variant="outlined"
            label={`${t.name} ${t.percent.toFixed(1)}%`}
          />
        ))}
      </Box>
    );
  };

  return (
    <Paper
      elevation={isMobile ? 0 : 3}
      sx={{
        p: isMobile ? 0 : 3,
        mb: 4,
        bgcolor: isMobile ? "transparent" : "background.paper",
        borderRadius: isMobile ? 0 : 2,
        boxShadow: isMobile ? "none" : undefined,
      }}
    >
      <Typography variant="h6" fontWeight="bold" mb={2}>
        ポートフォリオ分析
      </Typography>

      <Grid container spacing={2} mb={3}>
        {metrics.map((metric) => (
          <Grid key={metric.label} size={{ xs: 12, sm: 6, md: 4 }}>
            <Tooltip title={metric.tooltip} arrow>
              <Card>
                <CardContent sx={{ py: 2 }}>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {metric.label}
                      </Typography>
                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        color={metric.color}
                      >
                        {metric.value}
                      </Typography>
                    </Box>
                    {metric.icon && (
                      <Box color={metric.color}>{metric.icon}</Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Tooltip>
          </Grid>
        ))}
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            分散度スコア
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Box flexGrow={1}>
              <LinearProgress
                variant="determinate"
                value={analysis.diversificationScore}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  "& .MuiLinearProgress-bar": {
                    backgroundColor:
                      analysis.diversificationScore >= 70
                        ? "#4caf50"
                        : analysis.diversificationScore >= 40
                          ? "#ff9800"
                          : "#f44336",
                  },
                }}
              />
            </Box>
            <Typography variant="h6" fontWeight="bold">
              {analysis.diversificationScore.toFixed(0)}
            </Typography>
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            mt={1}
            display="block"
          >
            {analysis.diversificationScore >= 70
              ? "良好な分散投資ができています"
              : analysis.diversificationScore >= 40
                ? "もう少し分散を増やすことを検討してください"
                : "集中投資になっています。リスク分散を推奨します"}
          </Typography>

          {breakdown && (
            <>
              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" fontWeight="bold" gutterBottom>
                なぜこの点数？
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                分散度スコアは「セクター / 銘柄 / 通貨 /
                種別」の4軸の分散を合成して計算しています。
                スコアが低いほど、どこかに偏り（集中）がある状態です。
              </Typography>

              <Grid container spacing={2} mt={0.5}>
                {(Object.keys(axisLabel) as Array<keyof typeof axisLabel>).map(
                  (key) => (
                    <Grid key={key} size={{ xs: 12, sm: 6 }}>
                      <Card variant="outlined">
                        <CardContent sx={{ py: 1.5 }}>
                          <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="baseline"
                          >
                            <Typography variant="subtitle2">
                              {axisLabel[key]}
                            </Typography>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {breakdown.axes[key].score.toFixed(0)}
                            </Typography>
                          </Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            {axisDescription[key]}
                          </Typography>
                          {renderTopChips(breakdown.axes[key].top)}
                        </CardContent>
                      </Card>
                    </Grid>
                  ),
                )}
              </Grid>

              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                どう分散すると良い？
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {suggestions.map((s) => (
                  <Typography key={s} variant="caption" color="text.secondary">
                    {s}
                  </Typography>
                ))}
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Paper>
  );
}
