// components/WatchlistDialog.tsx
"use client";

import AddAlertIcon from "@mui/icons-material/AddAlert";
import DeleteIcon from "@mui/icons-material/Delete";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useToast } from "./Toast";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTicker?: string;
  initialName?: string;
};

type AlertCondition = {
  id: string;
  alertType: "above" | "below";
  targetPrice: string;
};

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function normalizeTicker(input: string) {
  const t = input.trim().toUpperCase();
  if (/^\d{4}$/.test(t)) return `${t}.T`;
  return t;
}

export default function WatchlistDialog({
  open,
  onClose,
  onSuccess,
  initialTicker = "",
  initialName = "",
}: Props) {
  const [ticker, setTicker] = useState(initialTicker);
  const [stockName, setStockName] = useState(initialName);
  const [notes, setNotes] = useState("");
  const [inputValue, setInputValue] = useState(initialTicker);
  const [loading, setLoading] = useState(false);
  const [enableAlert, setEnableAlert] = useState(false);
  const [alertConditions, setAlertConditions] = useState<AlertCondition[]>([]);
  const { showSuccess, showError } = useToast();

  const shouldFetch = inputValue !== "" && !initialTicker;
  const { data: searchData, isLoading: searchLoading } = useSWR(
    shouldFetch ? ["search", inputValue] : null,
    ([_, q]) => api.searchStocks(q),
    { keepPreviousData: true, dedupingInterval: 500 },
  );

  const normalizedTicker = normalizeTicker(ticker);
  const shouldFetchPrice =
    enableAlert && /^[0-9A-Z.=]{1,20}$/.test(normalizedTicker);
  const { data: currentQuote } = useSWR(
    shouldFetchPrice ? ["quote", normalizedTicker] : null,
    ([_, t]) => api.fetchStockPrices(t).then((r) => r[0] || null),
    { revalidateOnFocus: false },
  );

  const calcDefaultTargetPrice = useCallback(
    (type: "above" | "below") => {
      const price = currentQuote?.price;
      if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
        return "";
      }
      const factor = type === "below" ? 0.97 : 1.03;
      const p = price * factor;
      const decimals = currentQuote?.currency === "USD" ? 2 : 0;
      return p.toFixed(decimals);
    },
    [currentQuote?.currency, currentQuote?.price],
  );

  useEffect(() => {
    if (!enableAlert) return;
    if (alertConditions.length > 0) return;
    setAlertConditions([
      {
        id: makeId(),
        alertType: "below",
        targetPrice: "",
      },
    ]);
  }, [enableAlert, alertConditions.length]);

  useEffect(() => {
    if (!enableAlert) return;
    if (!currentQuote?.price) return;

    setAlertConditions((prev) => {
      if (prev.length === 0) return prev;
      if (prev[0].targetPrice !== "") return prev;
      return [
        {
          ...prev[0],
          targetPrice: calcDefaultTargetPrice(prev[0].alertType),
        },
        ...prev.slice(1),
      ];
    });
  }, [calcDefaultTargetPrice, currentQuote?.price, enableAlert]);

  const handleSubmit = async () => {
    if (!ticker) return;

    setLoading(true);
    try {
      // ウォッチリストに追加
      await api.addToWatchlist(
        normalizedTicker,
        undefined,
        notes || stockName || undefined,
      );

      // アラートを設定
      if (enableAlert) {
        for (const cond of alertConditions) {
          const val = parseFloat(cond.targetPrice);
          if (!Number.isFinite(val) || val <= 0) continue;
          await api.createPriceAlert(normalizedTicker, cond.alertType, val);
        }
      }

      showSuccess("ウォッチリストに追加しました");
      onSuccess();
      resetForm();
    } catch {
      showError("追加に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTicker("");
    setStockName("");
    setNotes("");
    setInputValue("");
    setEnableAlert(false);
    setAlertConditions([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>ウォッチリストに追加</DialogTitle>
      <DialogContent>
        {initialTicker ? (
          <Box
            sx={{
              mt: 1,
              mb: 2,
              p: 2,
              bgcolor: "action.hover",
              borderRadius: 1,
            }}
          >
            <Typography variant="subtitle1" fontWeight="bold">
              {initialName || initialTicker}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {initialTicker}
            </Typography>
          </Box>
        ) : (
          <Autocomplete
            fullWidth
            freeSolo
            options={searchData?.options || []}
            loading={searchLoading}
            inputValue={inputValue}
            onInputChange={(_event, newInputValue) => {
              setInputValue(newInputValue);
              setTicker(newInputValue);
            }}
            onChange={(_event, newValue) => {
              if (newValue && typeof newValue !== "string") {
                setTicker(newValue.symbol);
                setStockName(newValue.name);
              }
            }}
            getOptionLabel={(option) =>
              typeof option === "string" ? option : option.symbol
            }
            renderOption={(props, option) => {
              const { key, ...optionProps } = props;
              if (typeof option === "string") return null;
              return (
                <li key={key} {...optionProps}>
                  <Box>
                    <Typography variant="body1">{option.symbol}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.name} ({option.exch})
                    </Typography>
                  </Box>
                </li>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="銘柄検索"
                placeholder="例: トヨタ, 7203"
                sx={{ mt: 1 }}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {searchLoading ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        )}

        <TextField
          margin="dense"
          label="メモ（任意）"
          multiline
          rows={2}
          fullWidth
          variant="outlined"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          sx={{ mt: 2 }}
        />

        <Box
          sx={{
            mt: 3,
            p: 2,
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
          }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={enableAlert}
                onChange={(e) => setEnableAlert(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <AddAlertIcon fontSize="small" />
                <Typography variant="body2">価格アラートを設定</Typography>
              </Box>
            }
          />

          {enableAlert && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mb={1}
              >
                {currentQuote?.price
                  ? `現在値: ${currentQuote.currency === "USD" ? "$" : "¥"}${currentQuote.price.toLocaleString()}`
                  : "現在値を取得中..."}
              </Typography>

              <Box display="flex" flexDirection="column" gap={1.5}>
                {alertConditions.map((cond) => (
                  <Box
                    key={cond.id}
                    sx={{
                      display: "flex",
                      gap: 1,
                      flexDirection: { xs: "column", sm: "row" },
                      alignItems: { xs: "stretch", sm: "center" },
                    }}
                  >
                    <FormControl
                      size="small"
                      sx={{
                        minWidth: { sm: 140 },
                        width: { xs: "100%", sm: "auto" },
                      }}
                    >
                      <InputLabel>条件</InputLabel>
                      <Select
                        value={cond.alertType}
                        label="条件"
                        onChange={(e) => {
                          const nextType = e.target.value as "above" | "below";
                          setAlertConditions((prev) =>
                            prev.map((p) =>
                              p.id === cond.id
                                ? {
                                    ...p,
                                    alertType: nextType,
                                    targetPrice:
                                      p.targetPrice === ""
                                        ? calcDefaultTargetPrice(nextType)
                                        : p.targetPrice,
                                  }
                                : p,
                            ),
                          );
                        }}
                      >
                        <MenuItem value="below">
                          <Box display="flex" alignItems="center" gap={1}>
                            <TrendingDownIcon fontSize="small" color="error" />
                            指定価格以下
                          </Box>
                        </MenuItem>
                        <MenuItem value="above">
                          <Box display="flex" alignItems="center" gap={1}>
                            <TrendingUpIcon fontSize="small" color="success" />
                            指定価格以上
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>

                    <TextField
                      size="small"
                      label="価格"
                      type="number"
                      value={cond.targetPrice}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAlertConditions((prev) =>
                          prev.map((p) =>
                            p.id === cond.id ? { ...p, targetPrice: v } : p,
                          ),
                        );
                      }}
                      InputProps={{
                        startAdornment: (
                          <Chip
                            icon={
                              cond.alertType === "above" ? (
                                <TrendingUpIcon />
                              ) : (
                                <TrendingDownIcon />
                              )
                            }
                            label={currentQuote?.currency === "USD" ? "$" : "¥"}
                            size="small"
                            color={
                              cond.alertType === "above" ? "success" : "error"
                            }
                            sx={{ mr: 1 }}
                          />
                        ),
                      }}
                      sx={{ flex: 1, width: { xs: "100%", sm: "auto" } }}
                    />

                    <Button
                      size="small"
                      color="inherit"
                      disabled={alertConditions.length <= 1}
                      onClick={() =>
                        setAlertConditions((prev) =>
                          prev.filter((p) => p.id !== cond.id),
                        )
                      }
                      startIcon={<DeleteIcon fontSize="small" />}
                      sx={{
                        minWidth: { sm: 90 },
                        width: { xs: "100%", sm: "auto" },
                      }}
                    >
                      削除
                    </Button>
                  </Box>
                ))}
              </Box>

              <Box
                mt={2}
                display="flex"
                justifyContent={{ xs: "stretch", sm: "flex-end" }}
              >
                <Button
                  size="small"
                  variant="outlined"
                  fullWidth
                  onClick={() =>
                    setAlertConditions((prev) => [
                      ...prev,
                      {
                        id: makeId(),
                        alertType: "above",
                        targetPrice: calcDefaultTargetPrice("above"),
                      },
                    ])
                  }
                >
                  条件を追加
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="inherit">
          キャンセル
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !ticker}
        >
          追加
        </Button>
      </DialogActions>
    </Dialog>
  );
}
