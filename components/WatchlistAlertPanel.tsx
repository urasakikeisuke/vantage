// components/WatchlistAlertPanel.tsx
"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import ReplayIcon from "@mui/icons-material/Replay";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  ListItemIcon,
  Menu,
  MenuItem as MuiMenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Fragment, type MouseEvent, useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import type { PriceAlert, WatchlistItem } from "@/types";
import PushSubscriptionControl from "./PushSubscriptionControl";
import StockDetailPanel from "./StockDetailPanel";
import { useToast } from "./Toast";
import WatchlistDialog from "./WatchlistDialog";

export default function WatchlistAlertPanel() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"), {
    noSsr: true,
  });
  const [watchlistDialogOpen, setWatchlistDialogOpen] = useState(false);
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  const [editAlert, setEditAlert] = useState<PriceAlert | null>(null);
  const [createAlertTicker, setCreateAlertTicker] = useState<string | null>(
    null,
  );
  const [editAlertType, setEditAlertType] = useState<"above" | "below">(
    "below",
  );
  const [editTargetPrice, setEditTargetPrice] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuTarget, setMenuTarget] = useState<WatchlistItem | null>(null);

  const { data: watchlist, mutate: mutateWatchlist } = useSWR<WatchlistItem[]>(
    "watchlist",
    () => api.fetchWatchlist(),
    { revalidateOnFocus: false },
  );

  const { data: alerts, mutate: mutateAlerts } = useSWR<PriceAlert[]>(
    "price-alerts",
    () => api.fetchPriceAlerts(),
    { revalidateOnFocus: false },
  );

  // 銘柄ごとのアラートをグループ化
  const alertsByTicker = (alerts || []).reduce(
    (acc, alert) => {
      if (!acc[alert.ticker]) {
        acc[alert.ticker] = [];
      }
      acc[alert.ticker].push(alert);
      return acc;
    },
    {} as Record<string, PriceAlert[]>,
  );

  const openEditDialog = (alert: PriceAlert) => {
    setEditAlert(alert);
    setCreateAlertTicker(null);
    setEditAlertType(alert.alert_type);
    setEditTargetPrice(String(alert.target_price));
  };

  const openCreateDialog = (ticker: string, currentPrice?: number) => {
    setEditAlert(null);
    setCreateAlertTicker(ticker);
    setEditAlertType("below");
    if (
      typeof currentPrice === "number" &&
      Number.isFinite(currentPrice) &&
      currentPrice > 0
    ) {
      setEditTargetPrice(String(Math.round(currentPrice * 0.97)));
    } else {
      setEditTargetPrice("");
    }
  };

  const closeAlertDialog = () => {
    setEditAlert(null);
    setCreateAlertTicker(null);
  };

  const handleMenuOpen = (e: MouseEvent<HTMLElement>, item: WatchlistItem) => {
    e.stopPropagation();
    setMenuAnchorEl(e.currentTarget);
    setMenuTarget(item);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuTarget(null);
  };

  const handleUpdateAlert = async () => {
    if (!editAlert) return;
    const nextPrice = Number.parseFloat(editTargetPrice);
    if (Number.isNaN(nextPrice)) return;

    setEditLoading(true);
    try {
      await api.updatePriceAlert(editAlert.id, editAlertType, nextPrice);
      mutateAlerts();
      showSuccess("アラートを更新しました");
      setEditAlert(null);
    } catch {
      showError("更新に失敗しました");
    } finally {
      setEditLoading(false);
    }
  };

  const handleCreateAlert = async () => {
    if (!createAlertTicker) return;
    const nextPrice = Number.parseFloat(editTargetPrice);
    if (Number.isNaN(nextPrice)) return;

    setEditLoading(true);
    try {
      await api.createPriceAlert(createAlertTicker, editAlertType, nextPrice);
      mutateAlerts();
      showSuccess("アラートを追加しました");
      setCreateAlertTicker(null);
    } catch {
      showError("追加に失敗しました");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteWatchlist = async (id: string) => {
    try {
      await api.removeFromWatchlist(id);
      mutateWatchlist();
      showSuccess("削除しました");
    } catch {
      showError("削除に失敗しました");
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      await api.deletePriceAlert(id);
      mutateAlerts();
      showSuccess("アラートを削除しました");
    } catch {
      showError("削除に失敗しました");
    }
  };

  const handleReactivateAlert = async (id: string) => {
    try {
      await api.setPriceAlertActive(id, true);
      mutateAlerts();
      showSuccess("アラートを再有効化しました");
    } catch {
      showError("再有効化に失敗しました");
    }
  };

  const handleWatchlistSuccess = () => {
    mutateWatchlist();
    mutateAlerts();
    setWatchlistDialogOpen(false);
  };

  const activeAlertCount = alerts?.filter((a) => a.is_active).length || 0;

  const panel = (
    <>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems={isMobile ? "stretch" : "center"}
        flexDirection={isMobile ? "column" : "row"}
        gap={isMobile ? 1.25 : 0}
        mb={2}
      >
        <Box
          display="flex"
          alignItems="center"
          gap={1}
          flexWrap="wrap"
          sx={{ minWidth: 0 }}
        >
          <VisibilityIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">
            ウォッチリスト
          </Typography>
          {activeAlertCount > 0 && (
            <Chip
              icon={<NotificationsActiveIcon />}
              label={`${activeAlertCount}件のアラート`}
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
        <Box
          display="flex"
          flexDirection="row"
          alignItems="center"
          gap={1}
          flexWrap={isMobile ? "nowrap" : "wrap"}
          sx={
            isMobile
              ? {
                  width: "100%",
                  justifyContent: "flex-end",
                }
              : undefined
          }
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <PushSubscriptionControl fullWidth={isMobile} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setWatchlistDialogOpen(true)}
              size="small"
              fullWidth={isMobile}
              sx={
                !isMobile
                  ? {
                      width: "100px",
                    }
                  : undefined
              }
            >
              銘柄追加
            </Button>
          </Box>
        </Box>
      </Box>

      {!watchlist || watchlist.length === 0 ? (
        <Box
          sx={{
            p: 3,
            borderRadius: 2,
            border: "1px dashed",
            borderColor: "divider",
          }}
        >
          <Typography color="text.secondary" align="center">
            ウォッチリストに銘柄を追加して、価格を監視しましょう
          </Typography>
        </Box>
      ) : isMobile ? (
        <Box display="flex" flexDirection="column" gap={1.25}>
          {watchlist.map((item) => {
            const itemAlerts = alertsByTicker[item.ticker] || [];
            const sortedItemAlerts = [...itemAlerts].sort((a, b) => {
              if (a.alert_type !== b.alert_type) {
                return a.alert_type === "below" ? -1 : 1;
              }
              return a.alert_type === "below"
                ? b.target_price - a.target_price
                : a.target_price - b.target_price;
            });
            const isExpanded = expandedTicker === item.ticker;

            return (
              <Paper
                key={item.id}
                variant="outlined"
                sx={{ p: 1.5, cursor: "pointer" }}
                onClick={() =>
                  setExpandedTicker(isExpanded ? null : item.ticker)
                }
              >
                <Box display="flex" alignItems="flex-start" gap={1}>
                  <IconButton
                    aria-label="expand row"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedTicker(isExpanded ? null : item.ticker);
                    }}
                    sx={{ mt: -0.25 }}
                  >
                    {isExpanded ? (
                      <KeyboardArrowUpIcon />
                    ) : (
                      <KeyboardArrowDownIcon />
                    )}
                  </IconButton>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight="bold" noWrap>
                      {item.name || item.ticker}
                    </Typography>
                    <Box
                      display="flex"
                      alignItems="center"
                      gap={0.75}
                      flexWrap="wrap"
                      mt={0.25}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {item.ticker}
                      </Typography>
                      <Chip
                        icon={<NotificationsActiveIcon />}
                        label={itemAlerts.length}
                        size="small"
                        color={itemAlerts.length > 0 ? "warning" : "default"}
                        variant="outlined"
                        sx={{ height: 20, fontWeight: 900 }}
                      />
                    </Box>
                  </Box>

                  <Box
                    sx={{ flexShrink: 0 }}
                    display="flex"
                    flexDirection="column"
                    alignItems="flex-end"
                    gap={0.5}
                  >
                    <Typography variant="body2" fontWeight="bold">
                      {item.currentPrice
                        ? `¥${item.currentPrice.toLocaleString()}`
                        : "-"}
                    </Typography>
                    {item.priceChangePercent !== undefined ? (
                      <Chip
                        label={`${item.priceChangePercent >= 0 ? "+" : ""}${item.priceChangePercent.toFixed(2)}%`}
                        color={
                          item.priceChangePercent >= 0 ? "success" : "error"
                        }
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontWeight: 900 }}
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </Box>

                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, item)}
                    sx={{ mt: -0.5, mr: -0.5 }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <Box
                    sx={{
                      mt: 1.5,
                      pl: 1.5,
                      borderLeft: "4px solid",
                      borderLeftColor: "custom.accent",
                    }}
                  >
                    <Box
                      sx={{
                        p: 2,
                        mb: 1.5,
                        bgcolor: "rgba(0,0,0,0.3)",
                        borderRadius: 2,
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                    >
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        gap={1}
                        mb={1}
                        flexWrap="wrap"
                      >
                        <Box
                          display="flex"
                          alignItems="center"
                          gap={1}
                          flexWrap="wrap"
                        >
                          <NotificationsActiveIcon color="primary" />
                          <Typography variant="subtitle2" fontWeight="bold">
                            価格アラート
                          </Typography>
                          <Chip
                            label={`${sortedItemAlerts.length}件`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>

                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={() =>
                            openCreateDialog(item.ticker, item.currentPrice)
                          }
                        >
                          追加
                        </Button>
                      </Box>

                      {sortedItemAlerts.length === 0 ? (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          アラートは未登録です
                        </Typography>
                      ) : (
                        <Box display="flex" flexDirection="column" gap={1}>
                          {sortedItemAlerts.map((alert, idx) => (
                            <Box
                              key={alert.id}
                              display="flex"
                              alignItems="center"
                              justifyContent="space-between"
                              gap={1}
                              sx={{
                                px: 1,
                                py: 0.75,
                                borderRadius: 1.5,
                                bgcolor: "rgba(255,255,255,0.04)",
                                border: "1px solid",
                                borderColor: "divider",
                              }}
                            >
                              <Box
                                display="flex"
                                alignItems="center"
                                gap={1}
                                flexWrap="wrap"
                              >
                                <Chip
                                  label={`A${idx + 1}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontWeight: 900 }}
                                />
                                <Chip
                                  icon={
                                    alert.alert_type === "above" ? (
                                      <TrendingUpIcon />
                                    ) : (
                                      <TrendingDownIcon />
                                    )
                                  }
                                  label={`${alert.alert_type === "above" ? "以上" : "以下"} ¥${alert.target_price.toLocaleString()}`}
                                  size="small"
                                  color={
                                    alert.alert_type === "above"
                                      ? "success"
                                      : "error"
                                  }
                                  variant="outlined"
                                  sx={{ fontWeight: 900 }}
                                />

                                {!alert.is_active && (
                                  <Chip
                                    label="発動済"
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                              </Box>

                              <Box display="flex" alignItems="center" gap={0.5}>
                                {!alert.is_active && (
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() =>
                                      handleReactivateAlert(alert.id)
                                    }
                                  >
                                    <ReplayIcon fontSize="small" />
                                  </IconButton>
                                )}
                                <IconButton
                                  size="small"
                                  onClick={() => openEditDialog(alert)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteAlert(alert.id)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                    <StockDetailPanel
                      ticker={item.ticker}
                      priceAlerts={sortedItemAlerts}
                    />
                  </Box>
                </Collapse>
              </Paper>
            );
          })}
        </Box>
      ) : (
        <TableContainer
          component={Box}
          sx={{
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>銘柄</TableCell>
                <TableCell align="right">現在値</TableCell>
                <TableCell align="right">変動</TableCell>
                <TableCell align="center">アラート</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {watchlist.map((item) => {
                const itemAlerts = alertsByTicker[item.ticker] || [];
                const sortedItemAlerts = [...itemAlerts].sort((a, b) => {
                  if (a.alert_type !== b.alert_type) {
                    return a.alert_type === "below" ? -1 : 1;
                  }
                  return a.alert_type === "below"
                    ? b.target_price - a.target_price
                    : a.target_price - b.target_price;
                });
                const isExpanded = expandedTicker === item.ticker;

                return (
                  <Fragment key={item.id}>
                    <TableRow
                      hover
                      sx={{
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        setExpandedTicker(isExpanded ? null : item.ticker)
                      }
                    >
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <IconButton
                            aria-label="expand row"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedTicker(
                                isExpanded ? null : item.ticker,
                              );
                            }}
                          >
                            {isExpanded ? (
                              <KeyboardArrowUpIcon />
                            ) : (
                              <KeyboardArrowDownIcon />
                            )}
                          </IconButton>

                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight="bold">
                              {item.name || item.ticker}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {item.ticker}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold">
                          {item.currentPrice
                            ? `¥${item.currentPrice.toLocaleString()}`
                            : "-"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {item.priceChangePercent !== undefined ? (
                          <Chip
                            label={`${item.priceChangePercent >= 0 ? "+" : ""}${item.priceChangePercent.toFixed(2)}%`}
                            color={
                              item.priceChangePercent >= 0 ? "success" : "error"
                            }
                            size="small"
                            variant="outlined"
                          />
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={<NotificationsActiveIcon />}
                          label={itemAlerts.length}
                          size="small"
                          color={itemAlerts.length > 0 ? "warning" : "default"}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell
                        align="center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteWatchlist(item.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 0 }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ px: 2, py: 2 }}>
                            <Box
                              sx={{
                                mb: 2,
                                pl: 2,
                                borderLeft: "4px solid",
                                borderLeftColor: "custom.accent",
                              }}
                            >
                              <Box
                                sx={{
                                  p: 2,
                                  mb: 1.5,
                                  bgcolor: "rgba(0,0,0,0.3)",
                                  borderRadius: 2,
                                  border: "1px solid rgba(255,255,255,0.05)",
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                              >
                                <Box
                                  display="flex"
                                  justifyContent="space-between"
                                  alignItems="center"
                                  gap={1}
                                  mb={1}
                                  flexWrap="wrap"
                                >
                                  <Box
                                    display="flex"
                                    alignItems="center"
                                    gap={1}
                                    flexWrap="wrap"
                                  >
                                    <NotificationsActiveIcon color="primary" />
                                    <Typography
                                      variant="subtitle2"
                                      fontWeight="bold"
                                    >
                                      価格アラート
                                    </Typography>
                                    <Chip
                                      label={`${sortedItemAlerts.length}件`}
                                      size="small"
                                      variant="outlined"
                                    />
                                  </Box>

                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    onClick={() =>
                                      openCreateDialog(
                                        item.ticker,
                                        item.currentPrice,
                                      )
                                    }
                                  >
                                    追加
                                  </Button>
                                </Box>

                                {sortedItemAlerts.length === 0 ? (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                  >
                                    アラートは未登録です
                                  </Typography>
                                ) : (
                                  <Box
                                    display="flex"
                                    flexDirection="column"
                                    gap={1}
                                  >
                                    {sortedItemAlerts.map((alert, idx) => (
                                      <Box
                                        key={alert.id}
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="space-between"
                                        gap={1}
                                        sx={{
                                          px: 1,
                                          py: 0.75,
                                          borderRadius: 1.5,
                                          bgcolor: "rgba(255,255,255,0.04)",
                                          border: "1px solid",
                                          borderColor: "divider",
                                        }}
                                      >
                                        <Box
                                          display="flex"
                                          alignItems="center"
                                          gap={1}
                                          flexWrap="wrap"
                                        >
                                          <Chip
                                            label={`A${idx + 1}`}
                                            size="small"
                                            variant="outlined"
                                            sx={{ fontWeight: 900 }}
                                          />
                                          <Chip
                                            icon={
                                              alert.alert_type === "above" ? (
                                                <TrendingUpIcon />
                                              ) : (
                                                <TrendingDownIcon />
                                              )
                                            }
                                            label={`${alert.alert_type === "above" ? "以上" : "以下"} ¥${alert.target_price.toLocaleString()}`}
                                            size="small"
                                            color={
                                              alert.alert_type === "above"
                                                ? "success"
                                                : "error"
                                            }
                                            variant="outlined"
                                            sx={{ fontWeight: 900 }}
                                          />

                                          {!alert.is_active && (
                                            <Chip
                                              label="発動済"
                                              size="small"
                                              variant="outlined"
                                            />
                                          )}
                                        </Box>

                                        <Box
                                          display="flex"
                                          alignItems="center"
                                          gap={0.5}
                                        >
                                          {!alert.is_active && (
                                            <IconButton
                                              size="small"
                                              color="primary"
                                              onClick={() =>
                                                handleReactivateAlert(alert.id)
                                              }
                                            >
                                              <ReplayIcon fontSize="small" />
                                            </IconButton>
                                          )}
                                          <IconButton
                                            size="small"
                                            onClick={() =>
                                              openEditDialog(alert)
                                            }
                                          >
                                            <EditIcon fontSize="small" />
                                          </IconButton>
                                          <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() =>
                                              handleDeleteAlert(alert.id)
                                            }
                                          >
                                            <DeleteIcon fontSize="small" />
                                          </IconButton>
                                        </Box>
                                      </Box>
                                    ))}
                                  </Box>
                                )}
                              </Box>
                              <StockDetailPanel
                                ticker={item.ticker}
                                priceAlerts={sortedItemAlerts}
                              />
                            </Box>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MuiMenuItem
          onClick={async () => {
            if (menuTarget) {
              await handleDeleteWatchlist(menuTarget.id);
            }
            handleMenuClose();
          }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          削除
        </MuiMenuItem>
      </Menu>

      <Dialog
        open={!!editAlert || !!createAlertTicker}
        onClose={closeAlertDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {editAlert ? "アラートを編集" : "アラートを追加"}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>条件</InputLabel>
            <Select
              value={editAlertType}
              label="条件"
              onChange={(e) =>
                setEditAlertType(e.target.value as "above" | "below")
              }
            >
              <MuiMenuItem value="above">
                <Box display="flex" alignItems="center" gap={1}>
                  <TrendingUpIcon color="success" fontSize="small" />
                  以上になったら
                </Box>
              </MuiMenuItem>
              <MuiMenuItem value="below">
                <Box display="flex" alignItems="center" gap={1}>
                  <TrendingDownIcon color="error" fontSize="small" />
                  以下になったら
                </Box>
              </MuiMenuItem>
            </Select>
          </FormControl>

          <TextField
            label="目標価格"
            type="number"
            fullWidth
            value={editTargetPrice}
            onChange={(e) => setEditTargetPrice(e.target.value)}
            sx={{ mt: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">¥</InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAlertDialog} color="inherit">
            キャンセル
          </Button>
          <Button
            onClick={editAlert ? handleUpdateAlert : handleCreateAlert}
            variant="contained"
            disabled={editLoading || !editTargetPrice}
          >
            {editAlert ? "更新" : "追加"}
          </Button>
        </DialogActions>
      </Dialog>

      <WatchlistDialog
        open={watchlistDialogOpen}
        onClose={() => setWatchlistDialogOpen(false)}
        onSuccess={handleWatchlistSuccess}
      />
    </>
  );

  if (isMobile) {
    return <Box sx={{ mb: 4 }}>{panel}</Box>;
  }

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        mb: 4,
        bgcolor: "background.paper",
        borderRadius: 2,
      }}
    >
      {panel}
    </Paper>
  );
}
