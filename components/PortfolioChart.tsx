"use client";

import { Box, Paper, Typography, useMediaQuery, useTheme } from "@mui/material";
import { useMemo } from "react";
import { ResponsiveContainer, Tooltip, Treemap } from "recharts";
import type { PortfolioRow } from "@/types";
import MotionWrapper from "./MotionWrapper";

type Props = {
  data: PortfolioRow[];
};

const COLORS = {
  gain: {
    base: "#29524eff",
    light: "#5e807cff",
    dark: "#0d4237ff",
  },
  loss: {
    base: "#a92e2cff",
    light: "#cd3939ff",
    dark: "#8b1b1bff",
  },
  neutral: "#939393ff",
  text: "#f7f7f7ff",
};

// biome-ignore lint/suspicious/noExplicitAny: Recharts Props
const CustomContent = (props: any) => {
  const { x, y, width, height, name, gainLossPercent, isMobile } = props;

  if (props.children && props.children.length > 0) return null;

  if (!width || !height || width <= 0 || height <= 0) return null;

  const percent = gainLossPercent || 0;

  let fill = COLORS.neutral;

  if (percent > 0) {
    if (percent > 20) fill = COLORS.gain.dark;
    else if (percent > 5) fill = COLORS.gain.base;
    else fill = COLORS.gain.light;
  } else if (percent < 0) {
    if (percent < -20) fill = COLORS.loss.dark;
    else if (percent < -5) fill = COLORS.loss.base;
    else fill = COLORS.loss.light;
  }

  const showText = width > 60 && height > 50;
  const isLarge = width > 180 && height > 100;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        style={{ cursor: "pointer" }}
        stroke="#d0d0d0ff"
        strokeWidth={1}
        strokeOpacity={0.1}
      />

      {showText && (
        <foreignObject
          x={x}
          y={y}
          width={width}
          height={height}
          style={{ pointerEvents: "none" }}
        >
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              p: 1,
              color: COLORS.text,
              overflow: "hidden",
            }}
          >
            <Typography
              sx={{
                fontSize: isLarge ? "24px" : "12px",
                fontWeight: 400,
                textAlign: "center",
                lineHeight: 1.2,
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: isMobile ? 1 : 2,
                overflow: "hidden",
                wordBreak: "break-word",
              }}
            >
              {name}
            </Typography>

            <Typography
              sx={{
                fontSize: isLarge ? "16px" : "10px",
                fontWeight: 300,
                opacity: 0.9,
                mt: 0.5,
              }}
            >
              {percent > 0 ? "+" : ""}
              {percent.toFixed(1)}%
            </Typography>
          </Box>
        </foreignObject>
      )}
    </g>
  );
};

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  // biome-ignore lint/suspicious/noExplicitAny: Recharts Props
  payload?: { payload: any }[];
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (!data || data.children || data.name === "root") return null;

    return (
      <Paper
        elevation={4}
        sx={{
          width: 220,
          p: 1.5,
          bgcolor: "#121212",
          backgroundImage: "none",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 1,
          zIndex: 9999,
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
        <Box display="flex" justifyContent="space-between" gap={1} mt={1}>
          <Typography variant="body2" color="#ccc">
            評価額:
          </Typography>
          <Typography variant="body2" fontWeight="bold" color="#fff">
            ¥{Math.round(data.value).toLocaleString()}
          </Typography>
        </Box>
        <Box display="flex" justifyContent="space-between" gap={1}>
          <Typography variant="body2" color="#ccc">
            損益:
          </Typography>
          <Typography
            variant="body2"
            fontWeight="bold"
            sx={{ color: data.gainLoss >= 0 ? "#4DB6AC" : "#E57373" }}
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

// biome-ignore lint/suspicious/noExplicitAny: Recharts Props
const SectorBorderContent = (props: any) => {
  const { x, y, width, height, depth } = props;

  if (!props.children || props.children.length === 0) {
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="transparent"
        stroke="none"
        style={{ cursor: "pointer" }}
      />
    );
  }

  if (depth > 0) {
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke="#121212"
        strokeWidth={4}
        style={{ pointerEvents: "none" }}
      />
    );
  }

  return null;
};

export default function PortfolioChart({ data }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const treeMapData = useMemo(() => {
    if (data.length === 0) return [];

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
        if (curr.sector) acc[key].sector = curr.sector;
        if (curr.quoteType) acc[key].quoteType = curr.quoteType;
        return acc;
      },
      {} as Record<string, PortfolioRow>,
    );

    const items = Object.values(grouped);
    // biome-ignore lint/suspicious/noExplicitAny: Recharts Props
    const sectors: Record<string, any[]> = {};

    items.forEach((item) => {
      const percent =
        item.investmentValue !== 0
          ? (item.gainLoss / item.investmentValue) * 100
          : 0;

      const node = {
        name: item.name,
        value: item.currentValue,
        gainLoss: item.gainLoss,
        gainLossPercent: percent,
        sector: item.sector || "その他",
      };

      let groupKey = "株式";
      if (item.quoteType === "MUTUALFUND" || item.type === "MUTUALFUND") {
        groupKey = "投資信託";
      } else if (item.sector) {
        groupKey = item.sector;
      }

      if (!sectors[groupKey]) sectors[groupKey] = [];
      sectors[groupKey].push(node);
    });

    const children = Object.keys(sectors)
      .map((sectorName) => {
        const sectorItems = sectors[sectorName].sort(
          (a, b) => b.value - a.value,
        );
        return {
          name: sectorName,
          children: sectorItems,
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
    <MotionWrapper delay={0.2}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          mt: 4,
          bgcolor: "background.paper",
          borderRadius: 2,
          height: 450,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography variant="h6" gutterBottom fontWeight="bold">
          資産構成
        </Typography>

        <Box
          sx={{
            flexGrow: 1,
            width: "100%",
            minHeight: 0,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: -2,
              left: -2,
              right: -2,
              bottom: -2,
            }}
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <Treemap
                data={treeMapData}
                dataKey="value"
                aspectRatio={16 / 9}
                stroke="none"
                fill="transparent"
                content={<CustomContent isMobile={isMobile} />}
                isAnimationActive={false}
              />
            </ResponsiveContainer>

            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            >
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <Treemap
                  data={treeMapData}
                  dataKey="value"
                  aspectRatio={16 / 9}
                  stroke="none"
                  fill="transparent"
                  content={<SectorBorderContent />}
                  isAnimationActive={false}
                >
                  <Tooltip content={<CustomTooltip />} cursor={false} />
                </Treemap>
              </ResponsiveContainer>
            </Box>
          </Box>
        </Box>
      </Paper>
    </MotionWrapper>
  );
}
