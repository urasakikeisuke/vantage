// app/page.tsx
"use client";

import AddIcon from "@mui/icons-material/Add";
import { Box, Container, Fab, Paper, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import AssetDialog, { type EditItem } from "@/components/AssetDialog";
import AssetHistoryChart from "@/components/AssetHistoryChart";
import AssetTable from "@/components/AssetTable";
import BuyMoreDialog from "@/components/BuyMoreDialog";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import HistoryDialog from "@/components/HistoryDialog";
import PortfolioChart from "@/components/PortfolioChart";
import PullToRefresh from "@/components/PullToRefresh";
import SummaryCards from "@/components/SummaryCards";
import { usePortfolio } from "@/hooks/usePortfolio";
import { createClient } from "@/lib/supabase/client";
import type { PortfolioRow } from "@/types";

export default function Home() {
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
  } = usePortfolio();

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

  const supabase = createClient();
  const router = useRouter();

  // 認証チェック
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) router.push("/login");
    };
    checkUser();
  }, [router, supabase]);

  // データ分割
  const stockRows = groupedRows.filter((r) => r.type !== "MUTUALFUND");
  const fundRows = groupedRows.filter((r) => r.type === "MUTUALFUND");

  // ハンドラ
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

  const handleAddClick = () => {
    setEditItem(null);
    setIsDialogOpen(true);
  };

  return (
    <PullToRefresh onRefresh={async () => fetchPortfolioData(true)}>
      <Box
        sx={{ flexGrow: 1, bgcolor: "background.default", minHeight: "100vh" }}
      >
        <AppHeader
          onRefresh={() => fetchPortfolioData(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
        />

        <Container maxWidth="lg" sx={{ mt: 4, pb: 10 }}>
          {loading ? (
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
                onDelete={deleteAsset}
              />
              <AssetTable
                title="投資信託"
                data={fundRows}
                onEdit={handleEdit}
                onBuyMore={handleBuyMore}
                onDelete={deleteAsset}
              />

              {rows.length === 0 && (
                <Paper sx={{ p: 4, textAlign: "center" }}>
                  <Typography color="text.secondary">
                    データがありません。右下のボタンから資産を追加してください。
                  </Typography>
                </Paper>
              )}
            </>
          )}

          <Fab
            color="primary"
            aria-label="add"
            sx={{ position: "fixed", bottom: 32, right: 32 }}
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
        </Container>
      </Box>
    </PullToRefresh>
  );
}
