"use client";

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import {
  Box,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  Tooltip as MuiTooltip,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import type React from "react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import useSWR from "swr"; // 追加
import { api } from "@/lib/api"; // 追加
import type { PriceAlert } from "@/types";

type Props = {
  ticker: string;
  priceAlerts?: PriceAlert[];
};

type Range = "5y" | "1y" | "6m" | "3m";

type ChartDataPoint = {
  close: number;
  // biome-ignore lint/suspicious/noExplicitAny: Ignore
  [key: string]: any;
};

// 修正: 欠損データ(null/undefined)に強いSMA計算と型定義
const calculateSMA = (data: ChartDataPoint[], window: number) => {
  return data.map((entry, index) => {
    // データ数が足りない期間はnull
    if (index < window - 1) return { ...entry, [`sma${window}`]: null };

    const slice = data.slice(index - window + 1, index + 1);

    // 有効な数値データだけを抽出
    const validValues = slice
      .map((d) => d.close)
      .filter((v) => typeof v === "number" && !Number.isNaN(v));

    if (validValues.length === 0) return { ...entry, [`sma${window}`]: null };

    // 有効データのみで平均を計算
    const sum = validValues.reduce((acc, curr) => acc + curr, 0);
    return { ...entry, [`sma${window}`]: sum / validValues.length };
  });
};

const formatLargeNumber = (num: number | null) => {
  if (!num) return "-";
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}兆`;
  if (num >= 1e8) return `${(num / 1e8).toFixed(0)}億`;
  return num.toLocaleString();
};

export default function StockDetailPanel({ ticker, priceAlerts }: Props) {
  const [range, setRange] = useState<Range>("1y");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"), {
    noSsr: true,
  });

  const {
    data,
    isLoading: loading,
    isValidating,
  } = useSWR(
    ["stockDetail", ticker, range],
    ([_, s, r]) => api.fetchStockDetail(s, r),
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );

  const handleRangeChange = (
    event: React.MouseEvent<HTMLElement>,
    newRange: Range | null,
  ) => {
    event.stopPropagation();
    if (newRange !== null) {
      setRange(newRange);
    }
  };

  const chartData = useMemo(() => {
    if (!data?.history) return [];
    let processed = calculateSMA(data.history, 25);
    processed = calculateSMA(processed, 75);
    return processed;
  }, [data]);

  const alertLines = useMemo(() => {
    return (priceAlerts || []).filter((a) => a.ticker === ticker);
  }, [priceAlerts, ticker]);

  if (loading && !data) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        p={4}
        minHeight={isMobile ? "200px" : "300px"}
        alignItems="center"
      >
        <CircularProgress size={24} color="secondary" />
      </Box>
    );
  }

  if (!data) return <Typography p={2}>データ取得失敗</Typography>;

  const { details } = data;
  const lastValidClose =
    [...chartData].reverse().find((d) => d.close != null)?.close || 0;
  const firstValidClose = chartData.find((d) => d.close != null)?.close || 0;
  const isPositive = lastValidClose >= firstValidClose;

  const chartColor = isPositive ? "#00E5FF" : "#ff1744";
  const isETF = details.quoteType === "ETF";

  const indicators = [
    {
      label: "PER (株価収益率)",
      value: details.per ? `${details.per.toFixed(1)}倍` : "-",
      desc: "現在の株価が「1株当たりの純利益」の何倍かを示す指標。一般的に低いほうが割安とされます。",
      direction: "low",
    },
    {
      label: "PBR (株価純資産倍率)",
      value: details.pbr ? `${details.pbr.toFixed(1)}倍` : "-",
      desc: "株価が「1株当たりの純資産」の何倍かを示す指標。1倍割れは解散価値より安いとされ、割安です。",
      direction: "low",
    },
    {
      label: "ROE (自己資本利益率)",
      value: details.roe ? `${(details.roe * 100).toFixed(1)}%` : "-",
      desc: "株主が出したお金を元手に、どれだけ効率よく利益を上げたか。一般的に高いほうが優秀な経営とされます。",
      direction: "high",
    },
    {
      label: "配当利回り",
      value: details.dividendYield
        ? `${(details.dividendYield * 100).toFixed(2)}%`
        : "-",
      desc: "株価に対して、年間でどれだけの配当金がもらえるかの割合。高いほうがインカムゲイン(定期収入)が多い。",
      direction: "high",
    },
    {
      label: "EPS (1株当たり利益)",
      value: details.eps ? `¥${Math.round(details.eps).toLocaleString()}` : "-",
      desc: "1株あたりどれだけの利益を稼ぎ出しているか。これが成長している企業は株価も上がりやすい。",
      direction: "high",
    },
    {
      label: "純利益率",
      value: details.profitMargin
        ? `${(details.profitMargin * 100).toFixed(1)}%`
        : "-",
      desc: "売上高のうち、最終的にどれだけ利益が残ったか。高いほど高付加価値なビジネスを行っています。",
      direction: "high",
    },
    {
      label: "時価総額",
      value: formatLargeNumber(details.marketCap),
      desc: "企業の規模を表す指標。株価 × 発行済株式数で計算されます。",
      direction: "neutral",
    },
    {
      label: "ベータ値",
      value: details.beta ? details.beta.toFixed(2) : "-",
      desc: "市場全体(TOPIXやS&P500)に対する値動きの感応度。1より高いと市場より激しく動き、低いと安定しています。",
      direction: "neutral",
    },
  ];

  return (
    <Box sx={{ p: 2, bgcolor: "rgba(0,0,0,0.3)", borderRadius: 2 }}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Box display="flex" gap={1} mb={2} flexWrap="wrap">
            {isETF ? (
              <Chip
                label="ETF"
                variant="outlined"
                size="small"
                sx={{
                  borderColor: "#FFD740",
                  color: "#FFD740",
                }}
              />
            ) : (
              <Chip
                label={details.sector}
                color="primary"
                variant="outlined"
                size="small"
              />
            )}
            {!isETF && (
              <Chip label={details.industry} variant="outlined" size="small" />
            )}
          </Box>

          <Grid container spacing={2}>
            {indicators.map((item) => (
              <Grid size={6} key={item.label}>
                {" "}
                {/* 修正: keyを一意なlabelに変更 */}
                <IndicatorItem item={item} />
              </Grid>
            ))}
          </Grid>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Box
            display="flex"
            flexDirection={isMobile ? "column-reverse" : "row"}
            justifyContent="flex-end"
            alignItems={isMobile ? "stretch" : "center"}
            mb={1}
            gap={2}
          >
            <Box
              display="flex"
              gap={2}
              justifyContent={isMobile ? "center" : "flex-start"}
              mt={isMobile ? 1 : 0}
            >
              <Box display="flex" alignItems="center" gap={0.5}>
                <Box width={12} height={2} bgcolor="#FF9800" borderRadius={1} />
                <Typography variant="caption" color="text.secondary">
                  25日線
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={0.5}>
                <Box width={12} height={2} bgcolor="#9C27B0" borderRadius={1} />
                <Typography variant="caption" color="text.secondary">
                  75日線
                </Typography>
              </Box>
            </Box>

            <ToggleButtonGroup
              value={range}
              exclusive
              onChange={handleRangeChange}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              size="small"
              fullWidth={isMobile}
              sx={{
                "& .MuiToggleButton-root": {
                  color: "text.secondary",
                  borderColor: "rgba(255,255,255,0.1)",
                  fontSize: "0.7rem",
                  py: 0.4,
                  px: 1.5,
                  "&.Mui-selected": {
                    color: chartColor,
                    bgcolor: "rgba(255,255,255,0.05)",
                    borderColor: chartColor,
                  },
                },
              }}
            >
              <ToggleButton value="5y">5年</ToggleButton>
              <ToggleButton value="1y">1年</ToggleButton>
              <ToggleButton value="6m">6ヶ月</ToggleButton>
              <ToggleButton value="3m">3ヶ月</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box
            height={isMobile ? 220 : 320}
            width="100%"
            sx={{ minWidth: 0, minHeight: 0, position: "relative" }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {isValidating && (
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 2,
                }}
              >
                <LinearProgress
                  sx={{
                    "& .MuiLinearProgress-bar": {
                      backgroundColor: "#00E5FF",
                    },
                  }}
                />
              </Box>
            )}
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 0,
                  left: isMobile ? -20 : -10,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient
                    id={`color-${ticker}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={chartColor}
                      stopOpacity={0.2}
                    />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#333"
                  vertical={false}
                />

                <XAxis
                  dataKey="date"
                  tick={{ fill: "#666", fontSize: 9 }}
                  tickMargin={10}
                  minTickGap={30}
                  tickFormatter={(str: string) => {
                    const d = new Date(str);
                    return range === "5y"
                      ? `${d.getFullYear()}`
                      : `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                  stroke="#444"
                />

                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fill: "#666", fontSize: 9 }}
                  tickFormatter={(val: number) => `¥${val.toLocaleString()}`}
                  stroke="#444"
                  width={isMobile ? 45 : 60}
                />

                {alertLines.map((a) => {
                  const color =
                    a.alert_type === "above" ? "#00E676" : "#FF5252";
                  const label =
                    a.alert_type === "above"
                      ? `以上 ¥${Math.round(a.target_price).toLocaleString()}`
                      : `以下 ¥${Math.round(a.target_price).toLocaleString()}`;
                  return (
                    <ReferenceLine
                      key={a.id}
                      y={a.target_price}
                      stroke={color}
                      strokeDasharray={a.is_active ? "6 4" : "2 6"}
                      strokeOpacity={a.is_active ? 0.9 : 0.55}
                      ifOverflow="extendDomain"
                      label={{
                        value: label,
                        position: "right",
                        fill: color,
                        fontSize: 11,
                      }}
                    />
                  );
                })}

                <RechartsTooltip
                  labelFormatter={(v: string) => v}
                  contentStyle={{
                    backgroundColor: "rgba(18,18,18,0.95)",
                    borderColor: "#333",
                    fontSize: 12,
                    color: "#fff",
                    borderRadius: 8,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                  }}
                  itemStyle={{ padding: 0 }}
                  formatter={(value, name) => {
                    if (typeof value !== "number") return ["-", String(name)];
                    if (name === "close")
                      return [`¥${Math.round(value).toLocaleString()}`, "株価"];
                    if (name === "sma25")
                      return [
                        `¥${Math.round(value).toLocaleString()}`,
                        "25日移動平均",
                      ];
                    if (name === "sma75")
                      return [
                        `¥${Math.round(value).toLocaleString()}`,
                        "75日移動平均",
                      ];
                    return [String(value), String(name)];
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={chartColor}
                  fill={`url(#color-${ticker})`}
                  strokeWidth={2}
                  activeDot={{ r: 5, strokeWidth: 0, fill: "#fff" }}
                  connectNulls
                />

                <Line
                  type="monotone"
                  dataKey="sma25"
                  stroke="#FF9800"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="sma75"
                  stroke="#9C27B0"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

const IndicatorItem = ({
  item,
}: {
  item: { label: string; value: string; desc: string; direction: string };
}) => {
  return (
    <MuiTooltip
      title={item.desc}
      arrow
      placement="top"
      enterTouchDelay={0}
      leaveTouchDelay={3000}
    >
      <Box
        sx={{
          p: 1.5,
          bgcolor: "rgba(255,255,255,0.03)",
          borderRadius: 1,
          border: "1px solid rgba(255,255,255,0.05)",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          transition: "all 0.2s",
          cursor: "help",
          "&:hover": {
            bgcolor: "rgba(255,255,255,0.06)",
            borderColor: "rgba(255,255,255,0.1)",
          },
        }}
      >
        <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            sx={{ fontSize: "0.7rem" }}
          >
            {item.label}
          </Typography>
          <InfoOutlinedIcon sx={{ fontSize: 14, color: "text.disabled" }} />
        </Box>

        <Box
          display="flex"
          alignItems="flex-end"
          justifyContent="space-between"
        >
          <Typography
            variant="body1"
            fontWeight="bold"
            sx={{ fontSize: "0.9rem" }}
          >
            {item.value}
          </Typography>

          {item.direction === "high" && (
            <MuiTooltip
              title="高いほうが良い"
              placement="right"
              arrow
              enterTouchDelay={0}
            >
              <TrendingUpIcon
                sx={{ fontSize: 16, color: "#00E5FF", opacity: 0.7 }}
              />
            </MuiTooltip>
          )}
          {item.direction === "low" && (
            <MuiTooltip
              title="低いほうが良い"
              placement="right"
              arrow
              enterTouchDelay={0}
            >
              <TrendingDownIcon
                sx={{ fontSize: 16, color: "#00E5FF", opacity: 0.7 }}
              />
            </MuiTooltip>
          )}
        </Box>
      </Box>
    </MuiTooltip>
  );
};
