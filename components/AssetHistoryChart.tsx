"use client";

import { Box, Paper, Typography } from "@mui/material";
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
  if (data.length === 0) return null;

  return (
    <MotionWrapper delay={0.1}>
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
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={1}
        >
          <Typography variant="h6" fontWeight="bold">
            資産推移
          </Typography>
          <Box display="flex" gap={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Box
                width={12}
                height={12}
                bgcolor="#D500F9"
                borderRadius="2px"
              />
              <Typography variant="caption" color="text.secondary">
                総資産
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Box width={12} height={2} bgcolor="#888" />
              <Typography variant="caption" color="text.secondary">
                元本
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            flexGrow: 1,
            width: "100%",
            minHeight: 0,
            position: "relative",
          }}
        >
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart
              data={data}
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
                tickFormatter={(str) => {
                  const d = new Date(str);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
                minTickGap={30}
              />

              <YAxis
                // 修正: 'auto' にして変動を見やすくする
                domain={["auto", "auto"]}
                tick={{ fill: "#666", fontSize: 11 }}
                stroke="#444"
                tickFormatter={(value) =>
                  value >= 1000000
                    ? `${(value / 10000).toLocaleString()}万`
                    : value.toLocaleString()
                }
                width={50}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(18,18,18,0.95)",
                  borderColor: "#333",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                }}
                labelFormatter={(label) => label}
                formatter={(value: number, name: string, _) => {
                  if (name === "total_value")
                    return [`¥${value.toLocaleString()}`, "総資産"];
                  if (name === "total_investment")
                    return [`¥${value.toLocaleString()}`, "元本"];
                  return [value, name];
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
        </Box>
      </Paper>
    </MotionWrapper>
  );
}
