// components/WatchlistPanel.tsx
"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import type { WatchlistItem } from "@/types";
import { useToast } from "./Toast";
import WatchlistDialog from "./WatchlistDialog";

export default function WatchlistPanel() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { showSuccess, showError } = useToast();

  const { data: watchlist, mutate } = useSWR<WatchlistItem[]>(
    "watchlist",
    () => api.fetchWatchlist(),
    { revalidateOnFocus: false },
  );

  const handleDelete = async (id: string) => {
    try {
      await api.removeFromWatchlist(id);
      mutate();
      showSuccess("ウォッチリストから削除しました");
    } catch {
      showError("削除に失敗しました");
    }
  };

  const handleSuccess = () => {
    mutate();
    setDialogOpen(false);
  };

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6" fontWeight="bold">
          ウォッチリスト
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          size="small"
        >
          追加
        </Button>
      </Box>

      {!watchlist || watchlist.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              ウォッチリストに銘柄を追加して、価格を監視しましょう
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>銘柄</TableCell>
                <TableCell align="right">現在値</TableCell>
                <TableCell align="right">変動</TableCell>
                <TableCell align="right">目標価格</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {watchlist.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {item.name || item.ticker}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.ticker}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {item.currentPrice
                      ? `¥${item.currentPrice.toLocaleString()}`
                      : "-"}
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
                  <TableCell align="right">
                    {item.target_price ? (
                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="flex-end"
                        gap={0.5}
                      >
                        <Typography variant="body2">
                          ¥{item.target_price.toLocaleString()}
                        </Typography>
                        {item.currentPrice &&
                          item.currentPrice >= item.target_price && (
                            <NotificationsActiveIcon
                              color="success"
                              fontSize="small"
                            />
                          )}
                      </Box>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(item.id)}
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

      <WatchlistDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={handleSuccess}
      />
    </Box>
  );
}
