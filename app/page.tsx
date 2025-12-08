// app/page.tsx
"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import HistoryIcon from "@mui/icons-material/History";
import LockIcon from "@mui/icons-material/Lock";
import LogoutIcon from "@mui/icons-material/Logout";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Fab,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { type MouseEvent, useCallback, useEffect, useState } from "react";
import AssetDialog, { type EditItem } from "@/components/AssetDialog";
import AssetHistoryChart from "@/components/AssetHistoryChart";
import BuyMoreDialog from "@/components/BuyMoreDialog";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import HistoryDialog from "@/components/HistoryDialog";
import PortfolioChart from "@/components/PortfolioChart";
import SummaryCards from "@/components/SummaryCards";
import { logOperation } from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";

type PortfolioItem = {
  id: string;
  ticker: string;
  shares: number;
  acquisition_price: number;
  account_type: string;
  is_locked: boolean;
};

type StockPrice = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  shortName: string;
  dividendRate: number;
  type?: string;
};

type PortfolioRow = PortfolioItem & {
  currentPrice: number;
  originalPrice: number;
  currentValue: number;
  investmentValue: number;
  gainLoss: number;
  gainLossPercent: number;
  name: string;
  currency: string;
  annualDividend: number;
  afterTaxGain: number;
  type?: string;
};

type HistoryData = {
  date: string;
  total_value: number;
  total_investment: number;
};

export default function Home() {
  const [rows, setRows] = useState<PortfolioRow[]>([]);
  const [historyData, setHistoryData] = useState<HistoryData[]>([]);
  const [loading, setLoading] = useState(true);

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

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuTargetItem, setMenuTargetItem] = useState<PortfolioRow | null>(
    null,
  );

  const [totalValue, setTotalValue] = useState(0);
  const [totalInvestment, setTotalInvestment] = useState(0);
  // 追加: 配当利回り計算用 (株式のみの投資額)
  const [totalStockInvestment, setTotalStockInvestment] = useState(0);
  const [totalDividend, setTotalDividend] = useState(0);
  const [_exchangeRate, setExchangeRate] = useState<number | null>(null);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      }
    };
    checkUser();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const recordHistory = useCallback(
    async (totalVal: number, totalInv: number) => {
      if (totalVal === 0) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split("T")[0];

      const { data: existing } = await supabase
        .from("asset_history")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .single();

      if (existing) {
        await supabase
          .from("asset_history")
          .update({ total_value: totalVal, total_investment: totalInv })
          .eq("id", existing.id);
      } else {
        await supabase.from("asset_history").insert({
          user_id: user.id,
          date: today,
          total_value: totalVal,
          total_investment: totalInv,
        });
      }
    },
    [supabase],
  );

  const fetchHistory = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("asset_history")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: true });

    if (data) {
      setHistoryData(data);
    }
  }, [supabase]);

  const fetchPortfolioData = useCallback(async () => {
    try {
      const { data: portfolios, error } = await supabase
        .from("portfolios")
        .select("*")
        .order("created_at", { ascending: true });

      if (error || !portfolios) throw error;

      if (portfolios.length === 0) {
        setRows([]);
        setTotalValue(0);
        setTotalInvestment(0);
        setTotalStockInvestment(0); // リセット
        setTotalDividend(0);
        setLoading(false);
        return;
      }

      const symbols = `${portfolios.map((p) => p.ticker).join(",")},USDJPY=X`;

      const res = await fetch(`/api/stocks?symbols=${symbols}`);
      const prices: StockPrice[] = await res.json();

      const usdjpy = prices.find((p) => p.symbol === "USDJPY=X")?.price || 150;
      setExchangeRate(usdjpy);

      let sumValue = 0;
      let sumInvestment = 0;
      let sumStockInv = 0; // 株式のみの投資額集計用
      let sumDividend = 0;

      const combinedData = portfolios.map((p) => {
        const priceData = prices.find((price) => price.symbol === p.ticker);
        const currency = priceData?.currency || "JPY";
        const rawPrice = priceData?.price || 0;
        const rate = currency === "USD" ? usdjpy : 1;
        const type = priceData?.type || "EQUITY";

        const currentPriceInYen = rawPrice * rate;

        let currentValue = 0;
        let investmentInYen = 0;

        if (type === "MUTUALFUND") {
          currentValue = (currentPriceInYen * p.shares) / 10000;
          investmentInYen = (p.acquisition_price * rate * p.shares) / 10000;
        } else {
          currentValue = currentPriceInYen * p.shares;
          investmentInYen = p.acquisition_price * rate * p.shares;
        }

        // --- 配当利回り計算用の修正 ---
        // 投資信託以外の元本のみを集計する
        if (type !== "MUTUALFUND") {
          sumStockInv += investmentInYen;
        }

        const dividendRaw = priceData?.dividendRate || 0;
        const annualDividend =
          type === "MUTUALFUND"
            ? (dividendRaw * rate * p.shares) / 10000
            : dividendRaw * rate * p.shares;

        const gainLoss = currentValue - investmentInYen;

        const isNisa = p.account_type?.includes("nisa");
        let afterTaxGain = gainLoss;
        if (!isNisa && gainLoss > 0) {
          afterTaxGain = gainLoss * (1 - 0.20315);
        }

        sumValue += currentValue;
        sumInvestment += investmentInYen;
        sumDividend += annualDividend;

        return {
          ...p,
          currency: currency,
          originalPrice: rawPrice,
          currentPrice: currentPriceInYen,
          currentValue: currentValue,
          investmentValue: investmentInYen,
          gainLoss: gainLoss,
          gainLossPercent:
            investmentInYen !== 0 ? (gainLoss / investmentInYen) * 100 : 0,
          name: priceData?.shortName || p.ticker,
          annualDividend: annualDividend,
          afterTaxGain: afterTaxGain,
          type: type,
        };
      });

      setRows(combinedData);
      setTotalValue(sumValue);
      setTotalInvestment(sumInvestment);
      setTotalStockInvestment(sumStockInv); // ステート更新
      setTotalDividend(sumDividend);

      await recordHistory(sumValue, sumInvestment);
      await fetchHistory();
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [recordHistory, fetchHistory, supabase]);

  useEffect(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  const handleMenuOpen = (
    event: MouseEvent<HTMLElement>,
    item: PortfolioRow,
  ) => {
    setAnchorEl(event.currentTarget);
    setMenuTargetItem(item);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuTargetItem(null);
  };

  const handleEditClick = () => {
    if (menuTargetItem) {
      setEditItem({
        id: menuTargetItem.id,
        ticker: menuTargetItem.ticker,
        shares: menuTargetItem.shares,
        acquisition_price: menuTargetItem.acquisition_price,
        account_type: menuTargetItem.account_type || "nisa_growth",
        is_locked: menuTargetItem.is_locked,
      });
      setIsDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleBuyMoreClick = () => {
    if (menuTargetItem) {
      setBuyMoreTarget({
        id: menuTargetItem.id,
        ticker: menuTargetItem.name,
        currentShares: menuTargetItem.shares,
        currentPrice: menuTargetItem.acquisition_price,
      });
      setIsBuyMoreOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteClick = async () => {
    if (
      menuTargetItem &&
      confirm(
        `本当に「${menuTargetItem.name || menuTargetItem.ticker}」を削除しますか？`,
      )
    ) {
      await logOperation(
        menuTargetItem.id,
        "delete",
        menuTargetItem.ticker,
        "削除",
        {
          ticker: menuTargetItem.ticker,
          shares: menuTargetItem.shares,
          acquisition_price: menuTargetItem.acquisition_price,
          account_type: menuTargetItem.account_type,
        },
        null,
      );

      const { error } = await supabase
        .from("portfolios")
        .delete()
        .eq("id", menuTargetItem.id);
      if (error) {
        alert(`削除に失敗しました: ${error.message}`);
      } else {
        fetchPortfolioData();
      }
    }
    handleMenuClose();
  };

  const handleAddClick = () => {
    setEditItem(null);
    setIsDialogOpen(true);
  };

  const renderAccountBadge = (row: PortfolioRow) => {
    if (row.account_type === "nisa_growth") {
      return (
        <Chip
          label="NISA成長投資枠"
          size="small"
          variant="outlined"
          sx={{
            height: 20,
            fontSize: "0.65rem",
            borderColor: "#BA68C8",
            color: "#BA68C8",
            fontWeight: "bold",
          }}
        />
      );
    }
    if (row.account_type === "nisa_tsumitate") {
      return (
        <Chip
          label="NISAつみたて投資枠"
          size="small"
          variant="outlined"
          sx={{
            height: 20,
            fontSize: "0.65rem",
            borderColor: "#29B6F6",
            color: "#29B6F6",
            fontWeight: "bold",
          }}
        />
      );
    }
    if (row.account_type === "specific") {
      return (
        <Chip
          label="特定口座"
          size="small"
          variant="outlined"
          sx={{
            height: 20,
            fontSize: "0.65rem",
            borderColor: "#2979FF",
            color: "#2979FF",
            fontWeight: "bold",
          }}
        />
      );
    }
    if (row.account_type === "general") {
      return (
        <Chip
          label="一般口座"
          size="small"
          variant="outlined"
          sx={{
            height: 20,
            fontSize: "0.65rem",
            borderColor: "#607D8B",
            color: "#607D8B",
            fontWeight: "bold",
          }}
        />
      );
    }
    return null;
  };

  const stockRows = rows.filter((r) => r.type !== "MUTUALFUND");
  const fundRows = rows.filter((r) => r.type === "MUTUALFUND");

  const renderTable = (title: string, data: PortfolioRow[]) => {
    if (data.length === 0) return null;
    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 2 }}>
          {title}
        </Typography>
        <TableContainer
          component={Paper}
          elevation={3}
          sx={{ bgcolor: "background.paper" }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width="35%">銘柄 / 口座</TableCell>
                <TableCell align="right" width="20%">
                  現在値 / 保有数
                </TableCell>
                <TableCell align="right" width="20%">
                  評価額 / 取得額
                </TableCell>
                <TableCell align="right" width="15%">
                  損益(税引後)
                </TableCell>
                <TableCell align="center" width="10%">
                  操作
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell component="th" scope="row">
                    <Box>
                      <Box display="flex" alignItems="center">
                        <Typography variant="body1" fontWeight="bold">
                          {row.name}
                        </Typography>
                        {row.is_locked && (
                          <Tooltip title="ロック中（編集不可）">
                            <LockIcon
                              sx={{
                                fontSize: 16,
                                ml: 0.5,
                                color: "text.secondary",
                              }}
                            />
                          </Tooltip>
                        )}
                      </Box>
                      <Box
                        display="flex"
                        alignItems="center"
                        gap={1}
                        flexWrap="wrap"
                        mt={0.5}
                      >
                        {renderAccountBadge(row)}
                        <Typography variant="caption" color="text.secondary">
                          {row.ticker}
                        </Typography>
                        {row.currency === "USD" && (
                          <Chip
                            label="USD"
                            size="small"
                            color="warning"
                            sx={{ height: 16, fontSize: "0.6rem" }}
                          />
                        )}
                      </Box>
                    </Box>
                  </TableCell>

                  <TableCell align="right">
                    <Box
                      display="flex"
                      flexDirection="column"
                      alignItems="flex-end"
                    >
                      <Typography variant="body2">
                        ¥{Math.round(row.currentPrice).toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.type === "MUTUALFUND"
                          ? `${row.shares.toLocaleString()}口`
                          : `${row.shares}株`}
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell align="right">
                    <Box
                      display="flex"
                      flexDirection="column"
                      alignItems="flex-end"
                    >
                      <Typography variant="body2" fontWeight="bold">
                        ¥{Math.round(row.currentValue).toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        取得: ¥
                        {Math.round(row.investmentValue).toLocaleString()}
                      </Typography>
                    </Box>
                  </TableCell>

                  <TableCell align="right">
                    <Tooltip
                      title={
                        !row.account_type?.includes("nisa") && row.gainLoss > 0
                          ? `税引前: +¥${Math.round(row.gainLoss).toLocaleString()}`
                          : "非課税または損失"
                      }
                    >
                      <Chip
                        label={`¥${Math.round(row.afterTaxGain).toLocaleString()} (${row.gainLossPercent?.toFixed(1)}%)`}
                        color={row.gainLoss >= 0 ? "success" : "error"}
                        variant="outlined"
                        size="small"
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      aria-label="more"
                      onClick={(e) => handleMenuOpen(e, row)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  return (
    <Box
      sx={{ flexGrow: 1, bgcolor: "background.default", minHeight: "100vh" }}
    >
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Toolbar>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, fontWeight: "bold", color: "primary.main" }}
          >
            Vantage
          </Typography>
          <Button
            startIcon={<HistoryIcon />}
            onClick={() => setIsHistoryOpen(true)}
            color="primary"
          >
            操作履歴
          </Button>
          <IconButton color="primary" onClick={handleLogout} sx={{ ml: 1 }}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, pb: 10 }}>
        {!loading && (
          <>
            {/* 修正: stockInvestment を渡す */}
            <SummaryCards
              totalValue={totalValue}
              totalInvestment={totalInvestment}
              totalDividend={totalDividend}
              stockInvestment={totalStockInvestment}
            />
            <AssetHistoryChart data={historyData} />
            {rows.length > 0 && <PortfolioChart data={rows} />}
          </>
        )}

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {renderTable("株式・ETF", stockRows)}
            {renderTable("投資信託", fundRows)}

            {rows.length === 0 && (
              <Paper sx={{ p: 4, textAlign: "center" }}>
                <Typography color="text.secondary">
                  データがありません。右下のボタンから資産を追加してください。
                </Typography>
              </Paper>
            )}
          </>
        )}

        {/* ... (Menu, Fab, Dialogs はそのまま) ... */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem
            onClick={handleBuyMoreClick}
            disabled={menuTargetItem?.is_locked}
          >
            <ListItemIcon>
              <ShoppingCartIcon
                fontSize="small"
                color={menuTargetItem?.is_locked ? "disabled" : "primary"}
              />
            </ListItemIcon>
            買い増し
          </MenuItem>
          <MenuItem onClick={handleEditClick}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            編集/ロック設定
          </MenuItem>
          <MenuItem onClick={handleDeleteClick} sx={{ color: "error.main" }}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            削除
          </MenuItem>
        </Menu>

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
          onSuccess={fetchPortfolioData}
          editItem={editItem}
        />

        <BuyMoreDialog
          open={isBuyMoreOpen}
          onClose={() => setIsBuyMoreOpen(false)}
          onSuccess={fetchPortfolioData}
          targetItem={buyMoreTarget}
        />

        <HistoryDialog
          open={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          onRestore={fetchPortfolioData}
        />
      </Container>
    </Box>
  );
}
