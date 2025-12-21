"use client";

import AddIcon from "@mui/icons-material/Add";
import {
  Box,
  Container,
  Fab,
  Paper,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import useSWR from "swr";
import AppHeader from "@/components/AppHeader";
import AssetDialog, { type EditItem } from "@/components/AssetDialog";
import AssetHistoryChart from "@/components/AssetHistoryChart";
import AssetTable from "@/components/AssetTable";
import BuyMoreDialog from "@/components/BuyMoreDialog";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import HistoryDialog from "@/components/HistoryDialog";
import NotificationsDialog from "@/components/NotificationsDialog";
import PortfolioChart from "@/components/PortfolioChart";
import PullToRefresh from "@/components/PullToRefresh";
import SellDialog from "@/components/SellDialog";
import SummaryCards from "@/components/SummaryCards";
import { usePortfolio } from "@/hooks/usePortfolio";
import { api } from "@/lib/api";
import type { HistoryData, PortfolioData, PortfolioRow } from "@/types";

const AnalysisPanel = dynamic(() => import("@/components/AnalysisPanel"), {
  ssr: false,
});
const WatchlistAlertPanel = dynamic(
  () => import("@/components/WatchlistAlertPanel"),
  { ssr: false },
);
const AIRecommendationsPanel = dynamic(
  () => import("@/components/AIRecommendationsPanel"),
  { ssr: false },
);

type Props = {
  initialPortfolioData?: PortfolioData;
  initialHistoryData?: HistoryData[];
};

export default function DashboardClient({
  initialPortfolioData,
  initialHistoryData,
}: Props) {
  const theme = useTheme();
  const mediaIsMobile = useMediaQuery(theme.breakpoints.down("sm"), {
    noSsr: true,
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isMobile = mounted ? mediaIsMobile : false;

  const {
    rows,
    groupedRows,
    historyData,
    loading,
    totalValue,
    totalInvestment,
    totalStockInvestment,
    totalDividend,
    fetchPortfolioData,
    deleteAsset,
  } = usePortfolio({
    fallbackPortfolioData: initialPortfolioData,
    fallbackHistoryData: initialHistoryData,
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<EditItem>(null);
  const [isBuyMoreOpen, setIsBuyMoreOpen] = useState(false);
  const [buyMoreTarget, setBuyMoreTarget] = useState<{
    id: string;
    ticker: string;
    currentShares: number;
    currentPrice: number;
  } | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [notificationsAnchorEl, setNotificationsAnchorEl] =
    useState<HTMLElement | null>(null);
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [refreshIndicator, setRefreshIndicator] = useState<{
    progress: number;
    refreshing: boolean;
  }>({ progress: 0, refreshing: false });
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [sellTarget, setSellTarget] = useState<{
    id: string;
    ticker: string;
    name: string;
    currentShares: number;
    currentPrice: number;
    acquisitionPrice: number;
    accountType: string;
  } | null>(null);

  // データ分割
  const stockRows = groupedRows.filter((r) => r.type !== "MUTUALFUND");
  const fundRows = groupedRows.filter((r) => r.type === "MUTUALFUND");

  const showSkeleton = loading && !initialPortfolioData;

  // ハンドラ
  const headerRefreshIndicator =
    manualRefreshing &&
    !refreshIndicator.refreshing &&
    refreshIndicator.progress === 0
      ? { progress: 0, refreshing: true }
      : refreshIndicator;

  const handleHeaderRefresh = () => {
    if (manualRefreshing || refreshIndicator.refreshing) return;
    setManualRefreshing(true);

    void (async () => {
      try {
        await fetchPortfolioData(true);
      } finally {
        setManualRefreshing(false);
      }
    })();
  };

  const handleEdit = (item: PortfolioRow) => {
    setEditItem({
      id: item.id,
      ticker: item.ticker,
      shares: item.shares,
      acquisition_price: item.acquisition_price,
      account_type: item.account_type || "nisa_growth",
      is_locked: item.is_locked,
    });
    setIsDialogOpen(true);
  };

  const handleBuyMore = (item: PortfolioRow) => {
    setBuyMoreTarget({
      id: item.id,
      ticker: item.name,
      currentShares: item.shares,
      currentPrice: item.acquisition_price,
    });
    setIsBuyMoreOpen(true);
  };

  const handleSell = (item: PortfolioRow) => {
    setSellTarget({
      id: item.id,
      ticker: item.ticker,
      name: item.name,
      currentShares: item.shares,
      currentPrice: item.currentPrice,
      acquisitionPrice: item.acquisition_price,
      accountType: item.account_type || "general",
    });
    setIsSellOpen(true);
  };

  const handleAddClick = () => {
    setEditItem(null);
    setIsDialogOpen(true);
  };

  const { data: unreadCountData, mutate: mutateUnreadCount } = useSWR(
    "notifications-unread-count",
    () => api.fetchUnreadNotificationCount(),
    {
      revalidateOnFocus: true,
      refreshInterval: 60_000,
    },
  );

  const unreadCount = unreadCountData?.count ?? 0;

  return (
    <Box
      sx={{ flexGrow: 1, bgcolor: "background.default", minHeight: "100vh" }}
    >
      <AppHeader
        onRefresh={handleHeaderRefresh}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenNotifications={(anchorEl) => setNotificationsAnchorEl(anchorEl)}
        unreadNotificationCount={unreadCount}
        refreshIndicator={headerRefreshIndicator}
      />

      <PullToRefresh
        onRefresh={async () => fetchPortfolioData(true)}
        onIndicatorChange={setRefreshIndicator}
      >
        <Container maxWidth="lg" sx={{ mt: 4, pb: 10 }}>
          {showSkeleton ? (
            <DashboardSkeleton />
          ) : (
            <>
              <SummaryCards
                totalValue={totalValue}
                totalInvestment={totalInvestment}
                totalDividend={totalDividend}
                stockInvestment={totalStockInvestment}
              />
              <AssetHistoryChart data={historyData} />
              {rows.length > 0 && <PortfolioChart data={rows} />}

              <AssetTable
                title="株式・ETF"
                data={stockRows}
                onEdit={handleEdit}
                onBuyMore={handleBuyMore}
                onSell={handleSell}
                onDelete={deleteAsset}
              />
              <AssetTable
                title="投資信託"
                data={fundRows}
                onEdit={handleEdit}
                onBuyMore={handleBuyMore}
                onSell={handleSell}
                onDelete={deleteAsset}
              />

              {rows.length > 0 && (
                <>
                  <Box sx={{ mt: 4 }}>
                    <AnalysisPanel />
                  </Box>

                  <Box sx={{ mt: 4 }}>
                    <WatchlistAlertPanel />
                  </Box>

                  <Box sx={{ mt: 4 }}>
                    <AIRecommendationsPanel />
                  </Box>
                </>
              )}

              {rows.length === 0 && (
                <Paper
                  elevation={isMobile ? 0 : 1}
                  sx={
                    isMobile
                      ? {
                          px: 0,
                          py: 3,
                          textAlign: "center",
                          bgcolor: "transparent",
                          borderRadius: 0,
                          boxShadow: "none",
                        }
                      : { p: 4, textAlign: "center" }
                  }
                >
                  <Typography color="text.secondary">
                    データがありません。右下のボタンから資産を追加してください。
                  </Typography>
                </Paper>
              )}
            </>
          )}
        </Container>
      </PullToRefresh>

      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: "fixed",
          right: 24,
          bottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
          zIndex: (t) => t.zIndex.appBar + 10,
        }}
        onClick={handleAddClick}
      >
        <AddIcon />
      </Fab>

      <AssetDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={() => fetchPortfolioData(false)}
        editItem={editItem}
      />

      <BuyMoreDialog
        open={isBuyMoreOpen}
        onClose={() => setIsBuyMoreOpen(false)}
        onSuccess={() => fetchPortfolioData(false)}
        targetItem={buyMoreTarget}
      />

      <HistoryDialog
        open={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onRestore={() => fetchPortfolioData(false)}
      />

      <NotificationsDialog
        anchorEl={notificationsAnchorEl}
        onClose={() => setNotificationsAnchorEl(null)}
        onChanged={() => {
          void mutateUnreadCount();
        }}
      />

      <SellDialog
        open={isSellOpen}
        onClose={() => setIsSellOpen(false)}
        onSuccess={() => fetchPortfolioData(false)}
        targetItem={sellTarget}
      />
    </Box>
  );
}
