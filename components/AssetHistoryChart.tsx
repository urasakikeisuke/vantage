// components/AssetHistoryChart.tsx
"use client";

import ShowChartIcon from "@mui/icons-material/ShowChart";
import { Box, Card, CardContent, Typography } from "@mui/material";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type HistoryData = {
  date: string;
  total_value: number;
  total_investment: number;
};

type Props = {
  data: HistoryData[];
};

export default function AssetHistoryChart({ data }: Props) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <Card
      sx={{
        height: "100%",
        bgcolor: "background.paper",
        borderRadius: 2,
        mb: 4,
      }}
    >
      <CardContent sx={{ py: 2, px: 2, "&:last-child": { pb: 2 } }}>
        <Box display="flex" alignItems="center" mb={2}>
          <ShowChartIcon color="primary" sx={{ mr: 1, fontSize: 20 }} />
          <Typography color="text.secondary" variant="body2">
            資産推移
          </Typography>
        </Box>

        <Box sx={{ width: "100%", height: 300 }}>
          {data.length > 0 ? (
            <ResponsiveContainer>
              <AreaChart
                data={data}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D500F9" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#D500F9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorInvest" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#00E5FF" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#666" // 軸の文字色 (ダークモードでも見やすいグレー)
                  fontSize={10}
                  tickMargin={10}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  stroke="#666"
                  fontSize={10}
                  tickFormatter={(val) => `${(val / 10000).toFixed(0)}万`}
                  width={35}
                  axisLine={false}
                  tickLine={false}
                />

                {/* 修正: グリッド線を薄い白に変更してダークモードに対応 */}
                <CartesianGrid
                  vertical={false}
                  stroke="rgba(255, 255, 255, 0.1)"
                />

                <Tooltip
                  labelFormatter={(label) =>
                    new Date(label).toLocaleDateString()
                  }
                  formatter={(value: number, name: string) => [
                    `¥${Math.round(value).toLocaleString()}`,
                    name === "total_value" ? "評価額" : "投資元本",
                  ]}
                  // 修正: ツールチップをダークモード仕様に変更
                  contentStyle={{
                    backgroundColor: "rgba(30, 30, 30, 0.9)", // 濃い黒背景
                    borderRadius: "8px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                    border: "1px solid rgba(255, 255, 255, 0.1)", // 薄い枠線
                    fontSize: "12px",
                    color: "#fff", // 文字色を白に
                  }}
                  // リストアイテムのスタイル
                  itemStyle={{ color: "#fff", padding: 0 }}
                  // ラベルのスタイル
                  labelStyle={{ color: "#ccc", marginBottom: "5px" }}
                />

                <Legend
                  // 凡例の文字色を少し明るく調整
                  formatter={(value) => (
                    <span
                      style={{
                        color: "#aaa",
                        fontSize: "11px",
                        fontWeight: "bold",
                      }}
                    >
                      {value === "total_value" ? "評価額" : "投資元本"}
                    </span>
                  )}
                  iconType="circle"
                  iconSize={8}
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: "10px" }}
                />

                <Area
                  type="monotone"
                  dataKey="total_value"
                  stroke="#D500F9"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                  name="total_value"
                  animationDuration={1500}
                />
                <Area
                  type="monotone"
                  dataKey="total_investment"
                  stroke="#00E5FF"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorInvest)"
                  name="total_investment"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              height="100%"
              flexDirection="column"
            >
              <Typography variant="body2" color="text.secondary">
                データ収集中...
              </Typography>
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ mt: 1 }}
              >
                明日以降、推移グラフが表示されます
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
