// components/PriceAlertPanel.tsx
"use client";

import AddAlertIcon from "@mui/icons-material/AddAlert";
import DeleteIcon from "@mui/icons-material/Delete";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import ReplayIcon from "@mui/icons-material/Replay";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
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
} from "@mui/material";
import { useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import type { PriceAlert } from "@/types";
import StockSearchAutocomplete from "./StockSearchAutocomplete";
import { useToast } from "./Toast";

export default function PriceAlertPanel() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ticker, setTicker] = useState("");
  const [alertType, setAlertType] = useState<"above" | "below">("above");
  const [targetPrice, setTargetPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  const { data: alerts, mutate } = useSWR<PriceAlert[]>(
    "price-alerts",
    () => api.fetchPriceAlerts(),
    { revalidateOnFocus: false },
  );

  const handleCreate = async () => {
    if (!ticker || !targetPrice) return;

    setLoading(true);
    try {
      await api.createPriceAlert(ticker, alertType, parseFloat(targetPrice));
      showSuccess("価格アラートを作成しました");
      mutate();
      setDialogOpen(false);
      setTicker("");
      setTargetPrice("");
    } catch {
      showError("アラートの作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deletePriceAlert(id);
      showSuccess("アラートを削除しました");
      mutate();
    } catch {
      showError("削除に失敗しました");
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await api.setPriceAlertActive(id, true);
      showSuccess("アラートを再有効化しました");
      mutate();
    } catch {
      showError("再有効化に失敗しました");
    }
  };

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <NotificationsActiveIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">
            価格アラート
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddAlertIcon />}
          onClick={() => setDialogOpen(true)}
          size="small"
        >
          追加
        </Button>
      </Box>

      {!alerts || alerts.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              価格アラートを設定して、目標価格に達したら通知を受け取りましょう
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>銘柄</TableCell>
                <TableCell align="center">条件</TableCell>
                <TableCell align="right">目標価格</TableCell>
                <TableCell align="center">状態</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {alerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {alert.ticker}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      icon={
                        alert.alert_type === "above" ? (
                          <TrendingUpIcon />
                        ) : (
                          <TrendingDownIcon />
                        )
                      }
                      label={alert.alert_type === "above" ? "以上" : "以下"}
                      size="small"
                      color={alert.alert_type === "above" ? "success" : "error"}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    ¥{alert.target_price.toLocaleString()}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={alert.is_active ? "有効" : "発動済"}
                      size="small"
                      color={alert.is_active ? "primary" : "default"}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {!alert.is_active && (
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleReactivate(alert.id)}
                      >
                        <ReplayIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(alert.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>価格アラートを追加</DialogTitle>
        <DialogContent>
          <StockSearchAutocomplete
            value={ticker}
            onChange={setTicker}
            label="銘柄"
            sx={{ mt: 1 }}
          />

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>条件</InputLabel>
            <Select
              value={alertType}
              label="条件"
              onChange={(e) =>
                setAlertType(e.target.value as "above" | "below")
              }
            >
              <MenuItem value="above">
                <Box display="flex" alignItems="center" gap={1}>
                  <TrendingUpIcon color="success" fontSize="small" />
                  以上になったら
                </Box>
              </MenuItem>
              <MenuItem value="below">
                <Box display="flex" alignItems="center" gap={1}>
                  <TrendingDownIcon color="error" fontSize="small" />
                  以下になったら
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="目標価格"
            type="number"
            fullWidth
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">¥</InputAdornment>
              ),
            }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            キャンセル
          </Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={loading || !ticker || !targetPrice}
          >
            追加
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
