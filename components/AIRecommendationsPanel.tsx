// components/AIRecommendationsPanel.tsx
"use client";

import AddIcon from "@mui/icons-material/Add";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckIcon from "@mui/icons-material/Check";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Collapse,
  IconButton,
  LinearProgress,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Fragment, useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { api } from "@/lib/api";
import StockDetailPanel from "./StockDetailPanel";
import WatchlistDialog from "./WatchlistDialog";

type Recommendation = {
  ticker: string;
  name: string;
  reason: string;
  score: number;
  tags?: string[];
  sector?: string;
  breakdown?: {
    weights: Record<string, number>;
    normalized: Record<string, number>;
    contributions: Record<string, number>;
    inputs: Record<string, number | null>;
  };
  backtest?: {
    return1m: number | null;
    return3m: number | null;
    return6m: number | null;
    return1y: number | null;
  };
};

export default function AIRecommendationsPanel() {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("sm"), {
    noSsr: true,
  });
  const [riskTolerance, setRiskTolerance] = useState<"low" | "medium" | "high">(
    "medium",
  );
  const [addedTickers, setAddedTickers] = useState<Set<string>>(new Set());
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<{
    ticker: string;
    name: string;
  } | null>(null);

  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);

  const { data: recommendations, isLoading } = useSWR<Recommendation[]>(
    ["ai-recommendations", riskTolerance],
    () => api.fetchStockRecommendations(riskTolerance),
    { revalidateOnFocus: false },
  );

  const dedupedRecommendations = useMemo(() => {
    const seen = new Set<string>();
    const out: Recommendation[] = [];
    for (const r of recommendations || []) {
      const k = (r.ticker || "").toUpperCase();
      if (!k) continue;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(r);
    }
    return out;
  }, [recommendations]);

  const { data: diagnosticsData, isLoading: diagnosticsLoading } = useSWR<
    | {
        recommendations: Recommendation[];
        diagnostics: {
          universeSize: number;
          excludedSize: number;
          candidateCount: number;
          eligibleCandidateCount: number;
          recommendationCount: number;
          cacheAgeMs: number | null;
          cacheSource: string | null;
          cacheFetchedAt: number | null;
          sectors: {
            eligibleCandidates: Record<string, number>;
            recommendations: Record<string, number>;
          };
          returns: {
            eligibleCandidates: Record<string, unknown>;
            recommendations: Record<string, unknown>;
          };
        };
      }
    | undefined
  >(
    diagnosticsOpen ? ["ai-recommendations-diagnostics", riskTolerance] : null,
    () => api.fetchStockRecommendationsDiagnostics(riskTolerance),
    { revalidateOnFocus: false },
  );

  const formatPct = (v: number | null) => {
    if (v == null) return "-";
    const pct = v * 100;
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}%`;
  };

  const returnTone = (v: number | null) => {
    if (typeof v !== "number") {
      return {
        fg: "text.secondary",
        bg: "rgba(255,255,255,0.06)",
        border: "divider",
      } as const;
    }
    if (v >= 0) {
      return {
        fg: "success.main",
        bg: "rgba(46, 125, 50, 0.14)",
        border: "rgba(46, 125, 50, 0.35)",
      } as const;
    }
    return {
      fg: "error.main",
      bg: "rgba(211, 47, 47, 0.12)",
      border: "rgba(211, 47, 47, 0.35)",
    } as const;
  };

  const handleOpenDialog = (ticker: string, name: string) => {
    setSelectedStock({ ticker, name });
    setDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    if (selectedStock) {
      setAddedTickers((prev) => new Set([...prev, selectedStock.ticker]));
    }
    setDialogOpen(false);
    setSelectedStock(null);
    mutate("watchlist");
    mutate("price-alerts");
  };

  const riskLabels = {
    low: { label: "低リスク", color: "success" as const },
    medium: { label: "中リスク", color: "warning" as const },
    high: { label: "高リスク", color: "error" as const },
  };

  const riskTone = {
    low: { title: "安定", sub: "安定重視", dot: "success.main" },
    medium: { title: "バランス", sub: "成長×安定", dot: "warning.main" },
    high: { title: "成長", sub: "成長重視", dot: "error.main" },
  } as const;

  const scoreTone = (score: number) => {
    if (score >= 90) {
      return {
        label: "Strong",
        fg: "success.main",
        bg: "rgba(46, 125, 50, 0.14)",
        bar: "linear-gradient(90deg, rgba(46,125,50,0.95), rgba(102,187,106,0.9))",
      };
    }
    if (score >= 80) {
      return {
        label: "Good",
        fg: "info.main",
        bg: "rgba(2, 136, 209, 0.14)",
        bar: "linear-gradient(90deg, rgba(2,136,209,0.95), rgba(79,195,247,0.9))",
      };
    }
    return {
      label: "Fair",
      fg: "text.secondary",
      bg: "rgba(255,255,255,0.06)",
      bar: "linear-gradient(90deg, rgba(158,158,158,0.9), rgba(189,189,189,0.8))",
    };
  };

  return (
    <>
      <Card
        elevation={isMobile ? 0 : 1}
        sx={
          isMobile
            ? {
                bgcolor: "transparent",
                borderRadius: 0,
                boxShadow: "none",
              }
            : undefined
        }
      >
        <CardContent
          sx={isMobile ? { p: 0, "&:last-child": { pb: 0 } } : undefined}
        >
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <AutoAwesomeIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              AI銘柄推薦
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Tabs
              value={riskTolerance}
              onChange={(_e, v) =>
                setRiskTolerance(v as "low" | "medium" | "high")
              }
              variant="fullWidth"
              sx={{
                "& .MuiTab-root": {
                  minHeight: 56,
                  textTransform: "none",
                },
              }}
            >
              <Tab
                value="low"
                label={
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "999px",
                        bgcolor: riskTone.low.dot,
                        boxShadow: "0 0 0 4px rgba(46,125,50,0.12)",
                      }}
                    />
                    <Box textAlign="left">
                      <Typography
                        variant="subtitle2"
                        fontWeight={800}
                        lineHeight={1.1}
                      >
                        {riskTone.low.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        lineHeight={1.1}
                      >
                        {riskTone.low.sub}
                      </Typography>
                    </Box>
                  </Box>
                }
              />
              <Tab
                value="medium"
                label={
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "999px",
                        bgcolor: riskTone.medium.dot,
                        boxShadow: "0 0 0 4px rgba(245,124,0,0.12)",
                      }}
                    />
                    <Box textAlign="left">
                      <Typography
                        variant="subtitle2"
                        fontWeight={800}
                        lineHeight={1.1}
                      >
                        {riskTone.medium.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        lineHeight={1.1}
                      >
                        {riskTone.medium.sub}
                      </Typography>
                    </Box>
                  </Box>
                }
              />
              <Tab
                value="high"
                label={
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "999px",
                        bgcolor: riskTone.high.dot,
                        boxShadow: "0 0 0 4px rgba(211,47,47,0.12)",
                      }}
                    />
                    <Box textAlign="left">
                      <Typography
                        variant="subtitle2"
                        fontWeight={800}
                        lineHeight={1.1}
                      >
                        {riskTone.high.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        lineHeight={1.1}
                      >
                        {riskTone.high.sub}
                      </Typography>
                    </Box>
                  </Box>
                }
              />
            </Tabs>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mt={1}
            >
              {riskTolerance === "low"
                ? "安定重視（高配当・ディフェンシブ）"
                : riskTolerance === "medium"
                  ? "バランス型（成長と安定）"
                  : "成長重視（グロース株）"}
            </Typography>
          </Box>

          {isLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={24} />
            </Box>
          ) : dedupedRecommendations && dedupedRecommendations.length > 0 ? (
            isMobile ? (
              <Box display="flex" flexDirection="column" gap={1.25}>
                {dedupedRecommendations.map((rec) => {
                  const isExpanded = expandedTicker === rec.ticker;
                  const contrib = rec.breakdown?.contributions;
                  const contribSum = contrib
                    ? Object.values(contrib).reduce(
                        (s, x) => s + (x || 0),
                        0,
                      ) || 1
                    : 1;
                  const tone = scoreTone(rec.score);

                  return (
                    <Paper
                      key={rec.ticker}
                      variant="outlined"
                      sx={{ p: 1.5, cursor: "pointer" }}
                      onClick={() =>
                        setExpandedTicker(isExpanded ? null : rec.ticker)
                      }
                    >
                      <Box display="flex" gap={1.25} alignItems="flex-start">
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <IconButton
                              aria-label="expand row"
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedTicker(
                                  isExpanded ? null : rec.ticker,
                                );
                              }}
                            >
                              {isExpanded ? (
                                <KeyboardArrowUpIcon />
                              ) : (
                                <KeyboardArrowDownIcon />
                              )}
                            </IconButton>

                            <TrendingUpIcon
                              fontSize="small"
                              color={riskLabels[riskTolerance].color}
                            />

                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography variant="subtitle2" fontWeight="bold">
                                {rec.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: "block" }}
                              >
                                {rec.ticker}
                              </Typography>
                            </Box>
                          </Box>

                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{ mt: 0.75 }}
                          >
                            {rec.reason}
                          </Typography>

                          {rec.tags && rec.tags.length > 0 && (
                            <Box
                              display="flex"
                              gap={0.5}
                              flexWrap="wrap"
                              mt={0.75}
                            >
                              {rec.tags.map((tag) => (
                                <Box
                                  key={tag}
                                  sx={{
                                    px: 0.9,
                                    py: 0.25,
                                    borderRadius: "999px",
                                    fontSize: "0.72rem",
                                    bgcolor: "rgba(255,255,255,0.05)",
                                    border: "1px solid",
                                    borderColor: "divider",
                                    color: "text.secondary",
                                  }}
                                >
                                  {tag}
                                </Box>
                              ))}
                            </Box>
                          )}
                        </Box>

                        <Box
                          display="flex"
                          flexDirection="column"
                          alignItems="flex-end"
                          gap={1}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "baseline",
                              justifyContent: "center",
                              gap: 0.75,
                              px: 1,
                              py: 0.35,
                              borderRadius: 1,
                              bgcolor: tone.bg,
                              color: tone.fg,
                              border: "1px solid",
                              borderColor: "divider",
                              minWidth: { xs: 62, sm: 74 },
                            }}
                          >
                            <Typography variant="subtitle2" fontWeight={900}>
                              {rec.score}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {tone.label}
                            </Typography>
                          </Box>

                          <Tooltip
                            title={
                              addedTickers.has(rec.ticker)
                                ? "追加済み"
                                : "ウォッチリストに追加"
                            }
                          >
                            <span>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  handleOpenDialog(rec.ticker, rec.name)
                                }
                                disabled={addedTickers.has(rec.ticker)}
                                color={
                                  addedTickers.has(rec.ticker)
                                    ? "success"
                                    : "primary"
                                }
                              >
                                {addedTickers.has(rec.ticker) ? (
                                  <CheckIcon fontSize="small" />
                                ) : (
                                  <AddIcon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </Box>

                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box
                          sx={{
                            mt: 1.5,
                            pl: 1.5,
                            borderLeft: "4px solid",
                            borderLeftColor: "custom.accent",
                          }}
                        >
                          <Box
                            sx={{
                              mb: 2,
                              p: 1.5,
                              borderRadius: 2,
                              bgcolor: "rgba(255,255,255,0.03)",
                              border: "1px solid",
                              borderColor: "divider",
                            }}
                          >
                            <Box
                              display="flex"
                              alignItems="center"
                              justifyContent="space-between"
                              gap={2}
                              flexWrap="wrap"
                            >
                              <Typography variant="subtitle2" fontWeight={900}>
                                スコア内訳
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {rec.sector ? `セクター: ${rec.sector}` : ""}
                              </Typography>
                            </Box>

                            {rec.breakdown ? (
                              <Box
                                mt={1.25}
                                display="flex"
                                flexDirection="column"
                                gap={1}
                              >
                                {(
                                  [
                                    ["dividend", "配当"],
                                    ["stability", "安定"],
                                    ["quality", "品質"],
                                    ["momentum", "モメンタム"],
                                    ["value", "割安"],
                                    ["diversity", "分散"],
                                  ] as const
                                ).map(([k, label]) => {
                                  const c = (rec.breakdown?.contributions?.[
                                    k
                                  ] || 0) as number;
                                  const share = Math.max(
                                    0,
                                    (c / contribSum) * 100,
                                  );
                                  return (
                                    <Box
                                      key={k}
                                      display="flex"
                                      alignItems="center"
                                      gap={1}
                                    >
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        noWrap
                                        sx={{ width: 80, flexShrink: 0 }}
                                      >
                                        {label}
                                      </Typography>
                                      <Box sx={{ flex: 1 }}>
                                        <LinearProgress
                                          variant="determinate"
                                          value={share}
                                          sx={{
                                            height: 7,
                                            borderRadius: 99,
                                            bgcolor: "rgba(255,255,255,0.06)",
                                            "& .MuiLinearProgress-bar": {
                                              borderRadius: 99,
                                              bgcolor: "custom.accent",
                                            },
                                          }}
                                        />
                                      </Box>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{
                                          width: 54,
                                          textAlign: "right",
                                          flexShrink: 0,
                                        }}
                                      >
                                        {share.toFixed(0)}%
                                      </Typography>
                                    </Box>
                                  );
                                })}
                              </Box>
                            ) : (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                mt={1}
                              >
                                内訳データなし
                              </Typography>
                            )}

                            {rec.backtest && (
                              <Box
                                mt={1.25}
                                display="flex"
                                gap={1}
                                flexWrap="wrap"
                              >
                                {(
                                  [
                                    ["1m", rec.backtest.return1m],
                                    ["3m", rec.backtest.return3m],
                                    ["6m", rec.backtest.return6m],
                                    ["1y", rec.backtest.return1y],
                                  ] as const
                                ).map(([label, v]) => {
                                  const retTone = returnTone(v);
                                  return (
                                    <Box
                                      key={label}
                                      sx={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 0.75,
                                        px: 1,
                                        py: 0.45,
                                        borderRadius: "999px",
                                        bgcolor: retTone.bg,
                                        border: "1px solid",
                                        borderColor: retTone.border,
                                      }}
                                    >
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          fontWeight: 900,
                                          letterSpacing: "0.02em",
                                          color: "text.secondary",
                                        }}
                                      >
                                        {label}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          fontWeight: 900,
                                          color: retTone.fg,
                                        }}
                                      >
                                        {formatPct(v)}
                                      </Typography>
                                    </Box>
                                  );
                                })}
                              </Box>
                            )}
                          </Box>

                          <StockDetailPanel ticker={rec.ticker} />
                        </Box>
                      </Collapse>
                    </Paper>
                  );
                })}
              </Box>
            ) : (
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ overflowX: "auto" }}
              >
                <Table size="small" sx={{ minWidth: 640 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell width="55%">銘柄</TableCell>
                      <TableCell align="center" width="15%">
                        スコア
                      </TableCell>
                      <TableCell align="right" width="30%">
                        操作
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dedupedRecommendations.map((rec) => {
                      const isExpanded = expandedTicker === rec.ticker;
                      const contrib = rec.breakdown?.contributions;
                      const contribSum = contrib
                        ? Object.values(contrib).reduce(
                            (s, x) => s + (x || 0),
                            0,
                          ) || 1
                        : 1;
                      return (
                        <Fragment key={rec.ticker}>
                          <TableRow
                            hover
                            sx={{
                              cursor: "pointer",
                              "& > *": { borderBottom: "unset" },
                            }}
                            onClick={() =>
                              setExpandedTicker(isExpanded ? null : rec.ticker)
                            }
                          >
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                <IconButton
                                  aria-label="expand row"
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedTicker(
                                      isExpanded ? null : rec.ticker,
                                    );
                                  }}
                                >
                                  {isExpanded ? (
                                    <KeyboardArrowUpIcon />
                                  ) : (
                                    <KeyboardArrowDownIcon />
                                  )}
                                </IconButton>

                                <TrendingUpIcon
                                  fontSize="small"
                                  color={riskLabels[riskTolerance].color}
                                />

                                <Box sx={{ minWidth: 0 }}>
                                  <Typography
                                    variant="subtitle2"
                                    fontWeight="bold"
                                  >
                                    {rec.name}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {rec.ticker}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                    sx={{ mt: 0.25 }}
                                  >
                                    {rec.reason}
                                  </Typography>
                                  {rec.tags && rec.tags.length > 0 && (
                                    <Box
                                      display="flex"
                                      gap={0.5}
                                      flexWrap="wrap"
                                      mt={0.5}
                                    >
                                      {rec.tags.map((tag) => (
                                        <Box
                                          key={tag}
                                          sx={{
                                            px: 0.9,
                                            py: 0.25,
                                            borderRadius: "999px",
                                            fontSize: "0.72rem",
                                            bgcolor: "rgba(255,255,255,0.05)",
                                            border: "1px solid",
                                            borderColor: "divider",
                                            color: "text.secondary",
                                          }}
                                        >
                                          {tag}
                                        </Box>
                                      ))}
                                    </Box>
                                  )}
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              {(() => {
                                const tone = scoreTone(rec.score);
                                return (
                                  <Box
                                    display="flex"
                                    flexDirection="column"
                                    gap={0.75}
                                  >
                                    <Box
                                      sx={{
                                        display: "inline-flex",
                                        alignItems: "baseline",
                                        justifyContent: "center",
                                        gap: 0.75,
                                        px: 1,
                                        py: 0.35,
                                        borderRadius: 1,
                                        bgcolor: tone.bg,
                                        color: tone.fg,
                                        border: "1px solid",
                                        borderColor: "divider",
                                        minWidth: { xs: 62, sm: 74 },
                                      }}
                                    >
                                      <Typography
                                        variant="subtitle2"
                                        fontWeight={900}
                                      >
                                        {rec.score}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        {tone.label}
                                      </Typography>
                                    </Box>

                                    <LinearProgress
                                      variant="determinate"
                                      value={rec.score}
                                      sx={{
                                        height: 7,
                                        borderRadius: 99,
                                        bgcolor: "rgba(255,255,255,0.06)",
                                        "& .MuiLinearProgress-bar": {
                                          borderRadius: 99,
                                          backgroundImage: tone.bar,
                                        },
                                      }}
                                    />
                                  </Box>
                                );
                              })()}
                            </TableCell>
                            <TableCell
                              align="right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Tooltip
                                title={
                                  addedTickers.has(rec.ticker)
                                    ? "追加済み"
                                    : "ウォッチリストに追加"
                                }
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleOpenDialog(rec.ticker, rec.name)
                                    }
                                    disabled={addedTickers.has(rec.ticker)}
                                    color={
                                      addedTickers.has(rec.ticker)
                                        ? "success"
                                        : "primary"
                                    }
                                  >
                                    {addedTickers.has(rec.ticker) ? (
                                      <CheckIcon fontSize="small" />
                                    ) : (
                                      <AddIcon fontSize="small" />
                                    )}
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </TableCell>
                          </TableRow>

                          <TableRow>
                            <TableCell
                              style={{ paddingBottom: 0, paddingTop: 0 }}
                              colSpan={3}
                            >
                              <Collapse
                                in={isExpanded}
                                timeout="auto"
                                unmountOnExit
                              >
                                <Box
                                  sx={{
                                    m: 2,
                                    pl: 2,
                                    borderLeft: "4px solid",
                                    borderLeftColor: "custom.accent",
                                  }}
                                >
                                  <Box
                                    sx={{
                                      mb: 2,
                                      p: 1.5,
                                      borderRadius: 2,
                                      bgcolor: "rgba(255,255,255,0.03)",
                                      border: "1px solid",
                                      borderColor: "divider",
                                    }}
                                  >
                                    <Box
                                      display="flex"
                                      alignItems="center"
                                      justifyContent="space-between"
                                      gap={2}
                                      flexWrap="wrap"
                                    >
                                      <Typography
                                        variant="subtitle2"
                                        fontWeight={900}
                                      >
                                        スコア内訳
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                      >
                                        {rec.sector
                                          ? `セクター: ${rec.sector}`
                                          : ""}
                                      </Typography>
                                    </Box>

                                    {rec.breakdown ? (
                                      <Box
                                        mt={1.25}
                                        display="flex"
                                        flexDirection="column"
                                        gap={1}
                                      >
                                        {(
                                          [
                                            ["dividend", "配当"],
                                            ["stability", "安定"],
                                            ["quality", "品質"],
                                            ["momentum", "モメンタム"],
                                            ["value", "割安"],
                                            ["diversity", "分散"],
                                          ] as const
                                        ).map(([k, label]) => {
                                          const c = (rec.breakdown
                                            ?.contributions?.[k] ||
                                            0) as number;
                                          const share = Math.max(
                                            0,
                                            (c / contribSum) * 100,
                                          );
                                          return (
                                            <Box
                                              key={k}
                                              display="flex"
                                              alignItems="center"
                                              gap={1}
                                            >
                                              <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                noWrap
                                                sx={{
                                                  width: 80,
                                                  flexShrink: 0,
                                                }}
                                              >
                                                {label}
                                              </Typography>
                                              <Box sx={{ flex: 1 }}>
                                                <LinearProgress
                                                  variant="determinate"
                                                  value={share}
                                                  sx={{
                                                    height: 7,
                                                    borderRadius: 99,
                                                    bgcolor:
                                                      "rgba(255,255,255,0.06)",
                                                    "& .MuiLinearProgress-bar":
                                                      {
                                                        borderRadius: 99,
                                                        bgcolor:
                                                          "custom.accent",
                                                      },
                                                  }}
                                                />
                                              </Box>
                                              <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{
                                                  width: 54,
                                                  textAlign: "right",
                                                  flexShrink: 0,
                                                }}
                                              >
                                                {share.toFixed(0)}%
                                              </Typography>
                                            </Box>
                                          );
                                        })}
                                      </Box>
                                    ) : (
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        mt={1}
                                      >
                                        内訳データなし
                                      </Typography>
                                    )}

                                    {rec.backtest && (
                                      <Box
                                        mt={1.25}
                                        display="flex"
                                        gap={1}
                                        flexWrap="wrap"
                                      >
                                        {(
                                          [
                                            ["1m", rec.backtest.return1m],
                                            ["3m", rec.backtest.return3m],
                                            ["6m", rec.backtest.return6m],
                                            ["1y", rec.backtest.return1y],
                                          ] as const
                                        ).map(([label, v]) => {
                                          const retTone = returnTone(v);
                                          return (
                                            <Box
                                              key={label}
                                              sx={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: 0.75,
                                                px: 1,
                                                py: 0.45,
                                                borderRadius: "999px",
                                                bgcolor: retTone.bg,
                                                border: "1px solid",
                                                borderColor: retTone.border,
                                              }}
                                            >
                                              <Typography
                                                variant="caption"
                                                sx={{
                                                  fontWeight: 900,
                                                  letterSpacing: "0.02em",
                                                  color: "text.secondary",
                                                }}
                                              >
                                                {label}
                                              </Typography>
                                              <Typography
                                                variant="caption"
                                                sx={{
                                                  fontWeight: 900,
                                                  color: retTone.fg,
                                                }}
                                              >
                                                {formatPct(v)}
                                              </Typography>
                                            </Box>
                                          );
                                        })}
                                      </Box>
                                    )}
                                  </Box>

                                  <StockDetailPanel ticker={rec.ticker} />
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          ) : (
            <Typography color="text.secondary" align="center" py={2}>
              推薦銘柄がありません
            </Typography>
          )}

          <Box mt={2}>
            <Button
              size="small"
              variant={diagnosticsOpen ? "contained" : "outlined"}
              onClick={() => setDiagnosticsOpen((v) => !v)}
            >
              {diagnosticsOpen ? "診断を閉じる" : "診断 / 検証"}
            </Button>

            {diagnosticsOpen && (
              <Box
                sx={{
                  mt: 1.5,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "rgba(255,255,255,0.03)",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                {diagnosticsLoading ? (
                  <Box display="flex" justifyContent="center" py={2}>
                    <CircularProgress size={20} />
                  </Box>
                ) : diagnosticsData?.diagnostics ? (
                  <Box display="flex" flexDirection="column" gap={0.75}>
                    <Typography variant="subtitle2" fontWeight={900}>
                      統計（API diagnostics=1）
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      universe: {diagnosticsData.diagnostics.universeSize} /
                      eligible:{" "}
                      {diagnosticsData.diagnostics.eligibleCandidateCount} /
                      excluded: {diagnosticsData.diagnostics.excludedSize} /
                      cache: {diagnosticsData.diagnostics.cacheSource || "-"}
                      {diagnosticsData.diagnostics.cacheAgeMs != null
                        ? ` (${Math.round(diagnosticsData.diagnostics.cacheAgeMs / 60000)}m)`
                        : ""}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    診断情報を取得できませんでした
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {selectedStock && (
        <WatchlistDialog
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setSelectedStock(null);
          }}
          onSuccess={handleDialogSuccess}
          initialTicker={selectedStock.ticker}
          initialName={selectedStock.name}
        />
      )}
    </>
  );
}
