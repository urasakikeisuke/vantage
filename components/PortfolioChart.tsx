"use client";

import { Box, Paper, Typography } from "@mui/material";
import { useMemo } from "react";
import { ResponsiveContainer, Tooltip, Treemap } from "recharts";
import type { PortfolioRow } from "@/types";

type Props = {
  data: PortfolioRow[];
};

// ■ 色の生成ロジック (Dark & Matte)
// 彩度を抑え、背景の黒(#121212)から浮きすぎない色にする
const getHeatmapColor = (percent: number) => {
  if (percent === 0) return "#263238"; // Blue Grey 900 (無変動)

  // 変動の強さ (±10%で最大)
  const intensity = Math.min(Math.abs(percent) / 10, 1);

  if (percent > 0) {
    // 利益: Deep Teal -> Emerald
    // ベース: #004D40 (Teal 900)
    // ハイライト: #00897B (Teal 600)
    // HSL: Hue 170, Sat 100%, Lightness 15% -> 35%
    // 彩度は落とさず、明度を低く保つことで「発光感」より「深み」を出す
    const l = 15 + intensity * 20; // 15% - 35%
    return `hsl(170, 80%, ${l}%)`;
  } else {
    // 損失: Deep Rose -> Red
    // ベース: #3E2723 (Brown 900) または #880E4F (Pink 900)
    // ここではエンジ色系: Hue 350, Sat 70%, Lightness 15% -> 35%
    const l = 15 + intensity * 20; // 15% - 35%
    return `hsl(350, 70%, ${l}%)`;
  }
};

// カスタムコンテンツレンダラー
// biome-ignore lint/suspicious/noExplicitAny: Recharts Props
const CustomContent = (props: any) => {
  const { x, y, width, height, name, gainLossPercent } = props;

  // サイズが無効または極端に小さい場合は描画しない
  if (!width || !height || width <= 0 || height <= 0) return null;

  const fill = props.fill || props.payload?.fill || "#222";
  const displayPercent =
    props.gainLossPercent ?? props.payload?.gainLossPercent ?? 0;

  return (
    <g>
      {/* 境界線の表現:
        rectのstrokeを太く(2px)し、色は背景色(#121212)と同じにする。
        これにより、隣り合うセルとの間に 4px の隙間があるように見える。
        これを「線」として見せる。
      */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: fill,
          stroke: "#121212",
          strokeWidth: 2,
          strokeOpacity: 1,
        }}
      />

      {/* テキスト表示 (領域に余裕がある場合のみ) */}
      {width > 45 && height > 35 && (
        <foreignObject
          x={x}
          y={y}
          width={width}
          height={height}
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              overflow: "hidden",
              padding: "2px",
              color: "rgba(255,255,255,0.85)", // 文字色も少し落とす
              fontFamily: '"Roboto", sans-serif',
              lineHeight: 1.1,
            }}
          >
            <span
              style={{
                fontSize: width > 90 ? "13px" : "10px",
                fontWeight: "600",
                textAlign: "center",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "100%",
                textShadow: "0 1px 2px rgba(0,0,0,0.8)", // 視認性確保のシャドウ
              }}
            >
              {name}
            </span>
            <span
              style={{
                fontSize: width > 90 ? "11px" : "9px",
                fontWeight: "400",
                opacity: 0.7,
                marginTop: "1px",
              }}
            >
              {displayPercent > 0 ? "+" : ""}
              {displayPercent.toFixed(1)}%
            </span>
          </div>
        </foreignObject>
      )}
    </g>
  );
};

// カスタムツールチップ
// biome-ignore lint/suspicious/noExplicitAny: Recharts Props
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    // グループノードは無視
    if (!data || data.children || data.name === "root") return null;

    return (
      <Paper
        sx={{
          p: 1.5,
          bgcolor: "rgba(30,30,30,0.98)", // ほぼ不透明なダークグレー
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 1,
          boxShadow: "0 8px 16px rgba(0,0,0,0.5)",
        }}
      >
        <Typography
          variant="subtitle2"
          fontWeight="bold"
          sx={{ color: "#eee" }}
        >
          {data.name}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: "#aaa", display: "block", mb: 0.5 }}
        >
          {data.sector}
        </Typography>
        <Box display="flex" justifyContent="space-between" gap={3}>
          <Typography variant="body2" color="#ccc">
            評価額:
          </Typography>
          <Typography variant="body2" fontWeight="bold" color="#fff">
            ¥{Math.round(data.value).toLocaleString()}
          </Typography>
        </Box>
        <Box display="flex" justifyContent="space-between" gap={3}>
          <Typography variant="body2" color="#ccc">
            損益:
          </Typography>
          <Typography
            variant="body2"
            fontWeight="bold"
            sx={{ color: data.gainLoss >= 0 ? "#4DB6AC" : "#E57373" }} // Tooltipは少し明るく
          >
            {data.gainLoss >= 0 ? "+" : ""}¥
            {Math.round(data.gainLoss).toLocaleString()}
          </Typography>
        </Box>
      </Paper>
    );
  }
  return null;
};

export default function PortfolioChart({ data }: Props) {
  const treeMapData = useMemo(() => {
    if (data.length === 0) return [];

    // 1. 銘柄(ticker)ごとに集計 (名寄せ)
    const grouped = data.reduce(
      (acc, curr) => {
        const key = curr.ticker;
        if (!acc[key]) {
          acc[key] = {
            ...curr,
            currentValue: 0,
            investmentValue: 0,
            gainLoss: 0,
          };
        }
        acc[key].currentValue += curr.currentValue;
        acc[key].investmentValue += curr.investmentValue;
        acc[key].gainLoss += curr.gainLoss;
        // APIから取得したセクター情報を優先
        if (curr.sector) acc[key].sector = curr.sector;
        if (curr.quoteType) acc[key].quoteType = curr.quoteType;

        return acc;
      },
      {} as Record<string, PortfolioRow>,
    );

    const items = Object.values(grouped);

    // 2. セクター/カテゴリごとにグルーピング
    const sectors: Record<string, any[]> = {};

    items.forEach((item) => {
      const percent =
        item.investmentValue !== 0
          ? (item.gainLoss / item.investmentValue) * 100
          : 0;

      const fill = getHeatmapColor(percent);

      const node = {
        name: item.name,
        value: item.currentValue,
        gainLoss: item.gainLoss,
        gainLossPercent: percent,
        fill: fill,
        sector: item.sector || "その他",
      };

      // グループキーの決定
      let groupKey = "株式";
      if (item.quoteType === "MUTUALFUND" || item.type === "MUTUALFUND") {
        groupKey = "投資信託";
      } else if (item.sector) {
        groupKey = item.sector;
      }

      if (!sectors[groupKey]) sectors[groupKey] = [];
      sectors[groupKey].push(node);
    });

    // 3. ツリー構造の作成
    // Rechartsでセクター間の隙間を表現するため、データ構造としての階層を作る
    const children = Object.keys(sectors)
      .map((sectorName) => {
        const sectorItems = sectors[sectorName].sort(
          (a, b) => b.value - a.value,
        );
        return {
          name: sectorName,
          children: sectorItems,
          // グループの合計値を計算して入れておく（Rechartsの挙動安定のため）
          value: sectorItems.reduce((sum, i) => sum + i.value, 0),
        };
      })
      .sort((a, b) => b.value - a.value);

    return [
      {
        name: "root",
        children: children,
        value: 0,
      },
    ];
  }, [data]);

  if (data.length === 0) return null;

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        mb: 4,
        mt: 4,
        bgcolor: "background.paper",
        borderRadius: 2,
        height: 400,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="h6" gutterBottom fontWeight="bold">
        資産構成
      </Typography>

      <Box sx={{ flexGrow: 1, width: "100%", minHeight: 0 }}>
        {/* minWidth={0} で警告回避 */}
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <Treemap
            data={treeMapData}
            dataKey="value"
            aspectRatio={16 / 9}
            // strokeはCustomContentで描くのでここでは背景色にしておく
            stroke="#121212"
            fill="#333"
            content={<CustomContent />}
            animationDuration={800}
            isAnimationActive={true}
          >
            <Tooltip content={<CustomTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}
