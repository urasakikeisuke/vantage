"use client";

import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import {
  Box,
  Chip,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HistoryData } from "@/types";
import MotionWrapper from "./MotionWrapper";

type Props = {
  data: HistoryData[];
};

export default function AssetHistoryChart({ data }: Props) {
  const theme = useTheme();
  const mediaIsMobile = useMediaQuery(theme.breakpoints.down("sm"), {
    noSsr: true,
  });
  const [range, setRange] = useState<"1m" | "3m" | "6m" | "1y" | "all">("1y");

  const [mounted, setMounted] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  useEffect(() => {
    setMounted(true);

    let raf1: number | null = null;
    let raf2: number | null = null;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setChartReady(true);
      });
    });

    return () => {
      if (raf1 != null) cancelAnimationFrame(raf1);
      if (raf2 != null) cancelAnimationFrame(raf2);
    };
  }, []);

  const isMobile = mounted ? mediaIsMobile : false;

  const rangeData = useMemo(() => {
    if (data.length === 0) return [];

    if (range === "all") return data;
    const last = data[data.length - 1];
    const end = new Date(last.date);

    const start = new Date(end);
    if (range === "1m") start.setMonth(start.getMonth() - 1);
    if (range === "3m") start.setMonth(start.getMonth() - 3);
    if (range === "6m") start.setMonth(start.getMonth() - 6);
    if (range === "1y") start.setFullYear(start.getFullYear() - 1);

    return data.filter((d) => {
      const dt = new Date(d.date);
      return dt >= start && dt <= end;
    });
  }, [data, range]);

  const latest = rangeData[rangeData.length - 1];
  const first = rangeData[0];

  const gainLoss = latest ? latest.total_value - latest.total_investment : 0;
  const gainLossPct = latest?.total_investment
    ? (gainLoss / latest.total_investment) * 100
    : 0;
  const isPositive = gainLoss >= 0;

  const formatYen = (v: number) => `¥${Math.round(v).toLocaleString()}`;

  const formatDateLabel = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  };

  const formatCompact = (value: number) => {
    if (value >= 100000000) return `${(value / 100000000).toFixed(1)}億`;
    if (value >= 1000000) return `${(value / 10000).toLocaleString()}万`;
    return value.toLocaleString();
  };

  if (data.length === 0) return null;

  const content = (
    <>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems={isMobile ? "stretch" : "center"}
        flexDirection={isMobile ? "column" : "row"}
        gap={isMobile ? 1.25 : 0}
        mb={1}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" fontWeight="bold">
            資産推移
          </Typography>
          {first && latest && (
            <Typography variant="caption" color="text.secondary">
              {formatDateLabel(first.date)} 〜 {formatDateLabel(latest.date)}
            </Typography>
          )}
        </Box>

        <Box
          display="flex"
          alignItems="center"
          gap={1}
          flexWrap="wrap"
          justifyContent={isMobile ? "flex-start" : "flex-end"}
        >
          <ToggleButtonGroup
            size="small"
            value={range}
            exclusive
            onChange={(_e, v) => {
              if (v) setRange(v);
            }}
            sx={
              isMobile
                ? {
                    width: "100%",
                    justifyContent: "space-between",
                    "& .MuiToggleButton-root": {
                      flex: 1,
                      px: 0,
                    },
                  }
                : undefined
            }
          >
            <ToggleButton value="1m">1m</ToggleButton>
            <ToggleButton value="3m">3m</ToggleButton>
            <ToggleButton value="6m">6m</ToggleButton>
            <ToggleButton value="1y">1y</ToggleButton>
            <ToggleButton value="all">all</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      <Box
        display="flex"
        alignItems="center"
        gap={1}
        flexWrap="wrap"
        justifyContent="flex-start"
        mb={1}
      >
        {latest && (
          <Chip
            size="small"
            label={`総資産 ${formatYen(latest.total_value)}`}
            sx={{ fontWeight: 900 }}
            variant="outlined"
          />
        )}
        {latest && (
          <Chip
            size="small"
            icon={isPositive ? <TrendingUpIcon /> : <TrendingDownIcon />}
            label={`${isPositive ? "+" : ""}${formatYen(gainLoss)} (${isPositive ? "+" : ""}${gainLossPct.toFixed(2)}%)`}
            color={isPositive ? "success" : "error"}
            variant="outlined"
            sx={{ fontWeight: 900 }}
          />
        )}
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          width: "100%",
          minHeight: 0,
          position: "relative",
        }}
      >
        {chartReady ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart
              data={rangeData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D500F9" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#D500F9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#333"
                vertical={false}
              />

              <XAxis
                dataKey="date"
                tick={{ fill: "#666", fontSize: 11 }}
                stroke="#444"
                tickFormatter={(str: string) => {
                  const d = new Date(str);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
                minTickGap={30}
              />

              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "#666", fontSize: 11 }}
                stroke="#444"
                tickFormatter={(value: number) => formatCompact(value)}
                width={50}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(18,18,18,0.95)",
                  borderColor: "#333",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                }}
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const p = (payload[0] as { payload?: HistoryData }).payload;
                  if (!p) return null;
                  const gl = p.total_value - p.total_investment;
                  const glPct = p.total_investment
                    ? (gl / p.total_investment) * 100
                    : 0;
                  const positive = gl >= 0;
                  return (
                    <Box
                      sx={{
                        px: 1.25,
                        py: 1,
                      }}
                    >
                      <Typography variant="caption" color="#bbb">
                        {formatDateLabel(String(label))}
                      </Typography>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        gap={2}
                        mt={0.75}
                      >
                        <Typography variant="caption" color="#bbb">
                          総資産
                        </Typography>
                        <Typography
                          variant="caption"
                          color="#fff"
                          fontWeight={900}
                        >
                          {formatYen(p.total_value)}
                        </Typography>
                      </Box>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        gap={2}
                      >
                        <Typography variant="caption" color="#bbb">
                          元本
                        </Typography>
                        <Typography
                          variant="caption"
                          color="#fff"
                          fontWeight={900}
                        >
                          {formatYen(p.total_investment)}
                        </Typography>
                      </Box>
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        gap={2}
                      >
                        <Typography variant="caption" color="#bbb">
                          損益
                        </Typography>
                        <Typography
                          variant="caption"
                          fontWeight={900}
                          sx={{ color: positive ? "#66bb6a" : "#ef5350" }}
                        >
                          {positive ? "+" : ""}
                          {formatYen(gl)} ({positive ? "+" : ""}
                          {glPct.toFixed(2)}%)
                        </Typography>
                      </Box>
                    </Box>
                  );
                }}
              />

              {/* 元本ライン (点線) */}
              <Line
                type="monotone"
                dataKey="total_investment"
                stroke="#888"
                strokeWidth={1}
                strokeDasharray="4 4"
                dot={false}
                activeDot={false}
                name="total_investment"
                isAnimationActive={true}
                animationDuration={1500}
                animationEasing="ease-out"
              />

              {/* 総資産エリア */}
              <Area
                type="monotone"
                dataKey="total_value"
                stroke="#D500F9"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
                name="total_value"
                activeDot={{ r: 4, fill: "#fff", stroke: "#D500F9" }}
                animationDuration={1500}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : null}
      </Box>
    </>
  );

  return (
    <MotionWrapper delay={0.1}>
      {isMobile ? (
        <Box
          sx={{
            mb: 4,
            height: 350,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {content}
        </Box>
      ) : (
        <Paper
          elevation={3}
          sx={{
            p: 3,
            mb: 4,
            bgcolor: "background.paper",
            borderRadius: 2,
            height: 350,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {content}
        </Paper>
      )}
    </MotionWrapper>
  );
}
