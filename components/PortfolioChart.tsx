// components/PortfolioChart.tsx
"use client";

import PieChartIcon from "@mui/icons-material/PieChart";
import { Box, Card, CardContent, Grid, Typography } from "@mui/material";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#a4de6c",
];

type PortfolioRow = {
  ticker: string;
  currentValue: number;
  name?: string;
  type?: string;
};

type Props = {
  data: PortfolioRow[];
};

type LabelProps = {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
  name?: string;
};

export default function PortfolioChart({ data }: Props) {
  const aggregateData = (items: PortfolioRow[]) => {
    const map = new Map<string, number>();
    items.forEach((item) => {
      const key = item.name || item.ticker;
      const current = map.get(key) || 0;
      map.set(key, current + item.currentValue);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  };

  const funds = data.filter((d) => d.type === "MUTUALFUND");
  const fundsChartData = aggregateData(funds);
  const stocks = data.filter((d) => d.type !== "MUTUALFUND");
  const stocksChartData = aggregateData(stocks);

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    name,
  }: LabelProps) => {
    const _cx = cx || 0;
    const _cy = cy || 0;
    const _midAngle = midAngle || 0;
    const _innerRadius = innerRadius || 0;
    const _outerRadius = outerRadius || 0;
    const _percent = percent || 0;
    const _name = name || "";
    const RADIAN = Math.PI / 180;
    const _radius = _innerRadius + (_outerRadius - _innerRadius) * 0.5;
    const x = _cx + (_outerRadius + 30) * Math.cos(-_midAngle * RADIAN);
    const y = _cy + (_outerRadius + 30) * Math.sin(-_midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        // 修正: 文字色を明るいグレーにしてダークモードで見やすく
        fill="#ccc"
        textAnchor={x > _cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={11}
      >
        {`${_name} (${(_percent * 100).toFixed(0)}%)`}
      </text>
    );
  };

  const renderChart = (
    title: string,
    chartData: { name: string; value: number }[],
  ) => (
    <Card sx={{ height: "100%", bgcolor: "background.paper", borderRadius: 2 }}>
      <CardContent sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" mb={1}>
          <PieChartIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="subtitle2" color="text.secondary">
            {title}
          </Typography>
        </Box>
        <Box sx={{ width: "100%", height: 240 }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={60}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                  label={renderCustomizedLabel}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) =>
                    `¥${Math.round(value).toLocaleString()}`
                  }
                  // 修正: ダークモード風の黒背景・白文字・薄いボーダーに統一
                  contentStyle={{
                    backgroundColor: "rgba(30, 30, 30, 0.9)",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    color: "#fff",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  itemStyle={{ color: "#fff" }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              height="100%"
            >
              <Typography variant="caption" color="text.secondary">
                データなし
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Grid container spacing={2} sx={{ mb: 4 }}>
      <Grid size={{ xs: 12, md: 6 }}>
        {renderChart("資産構成 (株式・ETF)", stocksChartData)}
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        {renderChart("資産構成 (投資信託)", fundsChartData)}
      </Grid>
    </Grid>
  );
}
