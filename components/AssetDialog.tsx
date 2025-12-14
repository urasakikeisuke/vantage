// components/AssetDialog.tsx
"use client";

import {
  Autocomplete,
  Box,
  Button,
  Checkbox, // 追加
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel, // 追加
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import useSWR from "swr"; // 追加
import { api } from "@/lib/api"; // 追加
import { logOperation } from "@/lib/logger";
import { createClient } from "@/lib/supabase/client";

export type EditItem = {
  id: string;
  ticker: string;
  shares: number;
  acquisition_price: number;
  account_type: string;
  is_locked: boolean; // 追加
} | null;

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editItem: EditItem;
};

const ACCOUNT_TYPES = [
  { value: "nisa_growth", label: "NISA (成長投資枠)" },
  { value: "nisa_tsumitate", label: "NISA (つみたて枠)" },
  { value: "specific", label: "特定口座 (源泉徴収あり)" },
  { value: "general", label: "一般口座" },
];

type SearchOption = {
  symbol: string;
  name: string;
  type: string;
  exch: string;
};

export default function AssetDialog({
  open,
  onClose,
  onSuccess,
  editItem,
}: Props) {
  const supabase = createClient();

  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");
  const [accountType, setAccountType] = useState("nisa_growth");
  const [isLocked, setIsLocked] = useState(false); // 追加
  const [loading, setLoading] = useState(false);

  // Autocomplete用
  const [openAuto, setOpenAuto] = useState(false);
  const [options, setOptions] = useState<SearchOption[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [value, setValue] = useState<SearchOption | null>(null);

  useEffect(() => {
    if (open && editItem) {
      setTicker(editItem.ticker);
      setInputValue(editItem.ticker);
      setValue({ symbol: editItem.ticker, name: "", type: "", exch: "" });
      setShares(editItem.shares.toString());
      setPrice(editItem.acquisition_price.toString());
      setAccountType(editItem.account_type || "nisa_growth");
      setIsLocked(editItem.is_locked || false); // ロック状態反映
    } else if (open && !editItem) {
      setTicker("");
      setInputValue("");
      setValue(null);
      setShares("");
      setPrice("");
      setAccountType("nisa_growth");
      setIsLocked(false);
      setOptions([]);
    }
  }, [open, editItem]);

  // 検索ロジック (SWR)
  const shouldFetch = inputValue !== "";
  const { data: searchData, isLoading: searchLoading } = useSWR(
    shouldFetch ? ["search", inputValue] : null,
    ([_, q]) => api.searchStocks(q),
    {
      keepPreviousData: true,
      dedupingInterval: 500, // デバウンス的な効果
    },
  );

  useEffect(() => {
    if (inputValue === "") {
      setOptions(
        editItem
          ? [{ symbol: editItem.ticker, name: "", type: "", exch: "" }]
          : [],
      );
    } else if (searchData) {
      setOptions(searchData.options || []);
    }
  }, [inputValue, editItem, searchData]);

  const handleSubmit = async () => {
    if (!ticker || !shares || !price) return;
    setLoading(true);
    let error = null;

    const payload = {
      ticker: ticker.toUpperCase(),
      shares: Number(shares),
      acquisition_price: Number(price),
      account_type: accountType,
      is_locked: isLocked, // DB保存
    };

    if (editItem) {
      await logOperation(
        editItem.id,
        "edit",
        editItem.ticker,
        `編集: ${editItem.shares}株→${payload.shares}株${isLocked ? " (ロック)" : ""}`,
        editItem,
        payload,
      );

      const { error: updateError } = await supabase
        .from("portfolios")
        .update(payload)
        .eq("id", editItem.id);
      error = updateError;
    } else {
      const { data, error: insertError } = await supabase
        .from("portfolios")
        .insert([payload])
        .select()
        .single();

      error = insertError;

      if (data) {
        await logOperation(
          data.id,
          "add",
          payload.ticker,
          "新規追加",
          null,
          data,
        );
      }
    }

    setLoading(false);
    if (error) {
      alert(`エラー: ${error.message}`);
    } else {
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        {editItem ? "保有資産を編集" : "新しい資産を追加"}
      </DialogTitle>
      <DialogContent>
        <TextField
          select
          margin="dense"
          label="口座区分"
          fullWidth
          variant="outlined"
          value={accountType}
          onChange={(e) => setAccountType(e.target.value)}
          sx={{ mb: 2 }}
        >
          {ACCOUNT_TYPES.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        <Autocomplete
          id="ticker-search"
          fullWidth
          freeSolo
          open={openAuto}
          onOpen={() => setOpenAuto(true)}
          onClose={() => setOpenAuto(false)}
          isOptionEqualToValue={(option, value) =>
            option.symbol === value.symbol
          }
          getOptionLabel={(option) =>
            typeof option === "string" ? option : option.symbol
          }
          filterOptions={(x) => x}
          options={options}
          loading={searchLoading}
          value={value}
          inputValue={inputValue}
          onInputChange={(_event, newInputValue) => {
            setInputValue(newInputValue);
            setTicker(newInputValue);
            setValue({ symbol: newInputValue, name: "", type: "", exch: "" });
          }}
          onChange={(_event, newValue: SearchOption | string | null) => {
            if (newValue) {
              const symbol =
                typeof newValue === "string" ? newValue : newValue.symbol;
              setTicker(symbol);
              setValue(
                typeof newValue === "string"
                  ? { symbol: newValue, name: "", type: "", exch: "" }
                  : newValue,
              );
            }
          }}
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

        <TextField
          margin="dense"
          label="保有株数 / 口数"
          type="number"
          fullWidth
          variant="outlined"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          slotProps={{ htmlInput: { step: "any" } }}
          sx={{ mt: 2 }}
        />
        <TextField
          margin="dense"
          label="平均取得単価"
          type="number"
          fullWidth
          variant="outlined"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          helperText="投資信託は「1万口あたりの基準価額」を入力してください"
          slotProps={{ htmlInput: { step: "any" } }}
        />

        {/* ロック用チェックボックス */}
        <Box sx={{ mt: 2, p: 1, border: "1px dashed #ccc", borderRadius: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={isLocked}
                onChange={(e) => setIsLocked(e.target.checked)}
                color="error"
              />
            }
            label={
              <Typography variant="body2" color="text.primary">
                <b>読み取り専用（ロック）にする</b>
                <br />
                <span style={{ fontSize: "0.8rem", color: "#666" }}>
                  ※移管済みの資産など、今後買い増しや編集を行わない場合はチェックしてください。
                </span>
              </Typography>
            }
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          キャンセル
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
