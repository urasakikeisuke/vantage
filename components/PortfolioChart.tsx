"use client";

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

type GroupBy = "sector" | "account" | "currency" | "type";

const getAccountLabel = (accountType?: string) => {
  if (!accountType) return "一般";
  if (accountType === "nisa_growth") return "NISA成長";
  if (accountType === "nisa_tsumitate") return "NISA積立";
  if (accountType === "specific") return "特定";
  if (accountType === "general") return "一般";
  return accountType;
};

const getTypeLabel = (row: PortfolioRow) => {
  if (row.quoteType === "MUTUALFUND" || row.type === "MUTUALFUND")
    return "投資信託";
  if (row.quoteType === "ETF") return "ETF";
  if (row.quoteType === "EQUITY" || row.type === "EQUITY") return "株式";
  return row.quoteType || row.type || "その他";
};

const getGroupByLabel = (groupBy: GroupBy) => {
  if (groupBy === "sector") return "セクター";
  if (groupBy === "account") return "口座";
  if (groupBy === "currency") return "通貨";
  return "種別";
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
          {data.groupByLabel}: {data.groupName}
        </Typography>
        <Typography variant="caption" sx={{ color: "#888", display: "block" }}>
          口座: {data.accountLabel} / 通貨: {data.currency} / 種別:{" "}
          {data.typeLabel}
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
            騰落率:
          </Typography>
          <Typography
            variant="body2"
            fontWeight="bold"
            sx={{ color: data.gainLoss >= 0 ? "#4DB6AC" : "#E57373" }}
          >
            {data.gainLossPercent > 0 ? "+" : ""}
            {Number.isFinite(data.gainLossPercent)
              ? data.gainLossPercent.toFixed(2)
              : "0.00"}
            %
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
  const mediaIsMobile = useMediaQuery(theme.breakpoints.down("sm"), {
    noSsr: true,
  });

  const [groupBy, setGroupBy] = useState<GroupBy>("sector");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

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

  const { treeMapData, groupStats, totalValue } = useMemo(() => {
    if (data.length === 0)
      return {
        treeMapData: [],
        groupStats: [],
        totalValue: 0,
      };

    const grouped = data.reduce(
      (acc, curr) => {
        const key =
          groupBy === "account"
            ? `${curr.ticker}:${curr.account_type || ""}`
            : curr.ticker;

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
        if (curr.type) acc[key].type = curr.type;
        if (curr.currency) acc[key].currency = curr.currency;
        if (curr.account_type) acc[key].account_type = curr.account_type;
        return acc;
      },
      {} as Record<string, PortfolioRow>,
    );

    const items = Object.values(grouped);

    const groupByLabel = getGroupByLabel(groupBy);
    const totalValue = items.reduce((sum, i) => sum + (i.currentValue || 0), 0);

    // biome-ignore lint/suspicious/noExplicitAny: Recharts Props
    const groups: Record<string, any[]> = {};

    items.forEach((item) => {
      const percent =
        item.investmentValue !== 0
          ? (item.gainLoss / item.investmentValue) * 100
          : 0;

      const accountLabel = getAccountLabel(item.account_type);
      const typeLabel = getTypeLabel(item);
      const currency = item.currency || "JPY";

      let groupName = "その他";
      if (groupBy === "sector") {
        const sector =
          item.sector && item.sector !== "その他" ? item.sector : null;
        groupName = sector || typeLabel || "その他";
      } else if (groupBy === "account") {
        groupName = accountLabel;
      } else if (groupBy === "currency") {
        groupName = currency;
      } else {
        groupName = typeLabel;
      }

      const node = {
        name: item.name,
        value: item.currentValue,
        gainLoss: item.gainLoss,
        gainLossPercent: percent,
        groupName,
        groupByLabel,
        accountLabel,
        typeLabel,
        currency,
        ticker: item.ticker,
      };

      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(node);
    });

    const groupStats = Object.keys(groups)
      .map((name) => {
        const value = groups[name].reduce((sum, i) => sum + (i.value || 0), 0);
        const percent = totalValue !== 0 ? (value / totalValue) * 100 : 0;
        return { name, value, percent };
      })
      .sort((a, b) => b.value - a.value);

    const buildRootChildren = () =>
      groupStats.map((g) => {
        const groupItems = groups[g.name].sort((a, b) => b.value - a.value);
        return {
          name: g.name,
          children: groupItems,
          value: g.value,
        };
      });

    const children = buildRootChildren();

    const filteredChildren =
      activeGroup && groups[activeGroup]
        ? groups[activeGroup].sort((a, b) => b.value - a.value)
        : null;

    const treeMapData = [
      {
        name: "root",
        children: filteredChildren || children,
        value: 0,
      },
    ];

    return { treeMapData, groupStats, totalValue };
  }, [data, groupBy, activeGroup]);

  if (data.length === 0) return null;

  return (
    <MotionWrapper delay={0.2}>
      <Paper
        elevation={isMobile ? 0 : 3}
        sx={{
          p: isMobile ? 0 : 3,
          mb: 4,
          mt: 4,
          bgcolor: isMobile ? "transparent" : "background.paper",
          border: isMobile ? "none" : "1px solid",
          borderColor: isMobile ? "transparent" : "divider",
          borderRadius: isMobile ? 0 : 2,
          boxShadow: isMobile ? "none" : undefined,
          height: 520,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            資産構成
          </Typography>

          <ToggleButtonGroup
            exclusive
            size="small"
            value={groupBy}
            onChange={(_, v: GroupBy | null) => {
              if (!v) return;
              setActiveGroup(null);
              setGroupBy(v);
            }}
            sx={{
              bgcolor: "background.paper",
              borderRadius: 1,
            }}
          >
            <ToggleButton value="sector">セクター</ToggleButton>
            <ToggleButton value="account">口座</ToggleButton>
            <ToggleButton value="currency">通貨</ToggleButton>
            <ToggleButton value="type">種別</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box
          sx={{
            mt: 1,
            mb: 1,
            display: "flex",
            gap: 1,
            overflowX: "auto",
            py: 0.5,
          }}
        >
          <Chip
            size="small"
            clickable
            color={activeGroup == null ? "primary" : "default"}
            onClick={() => setActiveGroup(null)}
            label={`すべて ¥${Math.round(totalValue).toLocaleString()}`}
          />
          {groupStats.map((g) => (
            <Chip
              key={g.name}
              size="small"
              clickable
              color={activeGroup === g.name ? "primary" : "default"}
              onClick={() => setActiveGroup(g.name)}
              label={`${g.name} ${g.percent.toFixed(1)}%`}
            />
          ))}
        </Box>

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
            {chartReady ? (
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
            ) : null}

            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            >
              {chartReady ? (
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
              ) : null}
            </Box>
          </Box>
        </Box>
      </Paper>
    </MotionWrapper>
  );
}
