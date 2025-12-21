// components/StockSearchAutocomplete.tsx
"use client";

import {
  Autocomplete,
  Box,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  sx?: SxProps<Theme>;
};

export default function StockSearchAutocomplete({
  value: _value,
  onChange,
  label = "銘柄検索",
  placeholder = "例: トヨタ, 7203",
  sx,
}: Props) {
  const [inputValue, setInputValue] = useState("");

  const shouldFetch = inputValue.length >= 1;
  const { data: searchData, isLoading } = useSWR(
    shouldFetch ? ["search", inputValue] : null,
    ([, q]) => api.searchStocks(q),
    { keepPreviousData: true, dedupingInterval: 300 },
  );

  return (
    <Autocomplete
      fullWidth
      freeSolo
      options={searchData?.options || []}
      loading={isLoading}
      inputValue={inputValue}
      onInputChange={(_event, newInputValue) => {
        setInputValue(newInputValue);
        onChange(newInputValue);
      }}
      onChange={(_event, newValue) => {
        if (newValue && typeof newValue !== "string") {
          onChange(newValue.symbol);
          setInputValue(newValue.symbol);
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
          label={label}
          placeholder={placeholder}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isLoading ? (
                  <CircularProgress color="inherit" size={20} />
                ) : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      sx={sx}
    />
  );
}
