// components/AssetTable.tsx
"use client";

import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import LockIcon from "@mui/icons-material/Lock";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import {
  Box,
  Chip,
  Collapse,
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
  Typography,
} from "@mui/material";
import { Fragment, type MouseEvent, useState } from "react";
import type { GroupedPortfolio, PortfolioRow } from "@/types";
import StockDetailPanel from "./StockDetailPanel";

type Props = {
  title: string;
  data: GroupedPortfolio[];
  onEdit: (item: PortfolioRow) => void;
  onBuyMore: (item: PortfolioRow) => void;
  onDelete: (item: PortfolioRow) => void;
};

// 口座バッジコンポーネント
const AccountBadge = ({ type }: { type: string }) => {
  const badgeProps = {
    size: "small" as const,
    variant: "outlined" as const,
    sx: { height: 20, fontSize: "0.65rem", fontWeight: "bold" },
  };
  if (type === "nisa_growth")
    return (
      <Chip
        label="NISA成長"
        {...badgeProps}
        sx={{ ...badgeProps.sx, borderColor: "#BA68C8", color: "#BA68C8" }}
      />
    );
  if (type === "nisa_tsumitate")
    return (
      <Chip
        label="NISA積立"
        {...badgeProps}
        sx={{ ...badgeProps.sx, borderColor: "#29B6F6", color: "#29B6F6" }}
      />
    );
  if (type === "specific")
    return (
      <Chip
        label="特定"
        {...badgeProps}
        sx={{ ...badgeProps.sx, borderColor: "#2979FF", color: "#2979FF" }}
      />
    );
  return (
    <Chip
      label="一般"
      {...badgeProps}
      sx={{ ...badgeProps.sx, borderColor: "#607D8B", color: "#607D8B" }}
    />
  );
};

// 個別の行（アコーディオンの親）
function Row({
  row,
  onEdit,
  onBuyMore,
  onDelete,
}: {
  row: GroupedPortfolio;
  onEdit: (i: PortfolioRow) => void;
  onBuyMore: (i: PortfolioRow) => void;
  onDelete: (i: PortfolioRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuTargetItem, setMenuTargetItem] = useState<PortfolioRow | null>(
    null,
  );

  const handleMenuOpen = (
    event: MouseEvent<HTMLElement>,
    item: PortfolioRow,
  ) => {
    event.stopPropagation(); // アコーディオン開閉を防止
    setAnchorEl(event.currentTarget);
    setMenuTargetItem(item);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuTargetItem(null);
  };

  const isStock = row.type !== "MUTUALFUND";

  return (
    <Fragment>
      {/* 親行: 合計データを表示 */}
      <TableRow
        sx={{
          "& > *": { borderBottom: "unset" },
          cursor: "pointer",
          bgcolor: open ? "rgba(255,255,255,0.02)" : "inherit",
        }}
        onClick={() => setOpen(!open)}
      >
        <TableCell width="40%">
          <Box display="flex" alignItems="center">
            <IconButton
              aria-label="expand row"
              size="small"
              onClick={() => setOpen(!open)}
            >
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
            <Box ml={1}>
              <Typography variant="body1" fontWeight="bold">
                {row.name}
              </Typography>
              <Box display="flex" gap={1} mt={0.5}>
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
          </Box>
        </TableCell>

        {/* 合計: 現在値 / 総保有数 */}
        <TableCell align="right" width="20%">
          <Box display="flex" flexDirection="column" alignItems="flex-end">
            <Typography variant="body2">
              ¥{Math.round(row.currentPrice).toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.type === "MUTUALFUND"
                ? row.totalShares.toLocaleString()
                : row.totalShares}
            </Typography>
          </Box>
        </TableCell>

        {/* 合計: 評価額 / 投資額 */}
        <TableCell align="right" width="20%">
          <Box display="flex" flexDirection="column" alignItems="flex-end">
            <Typography variant="body2" fontWeight="bold">
              ¥{Math.round(row.totalCurrentValue).toLocaleString()}
            </Typography>
            {/* 「取得:」を削除 */}
            <Typography variant="caption" color="text.secondary">
              ¥{Math.round(row.totalInvestmentValue).toLocaleString()}
            </Typography>
          </Box>
        </TableCell>

        {/* 合計: 損益 */}
        <TableCell align="right" width="20%">
          <Chip
            label={`¥${Math.round(row.totalAfterTaxGain).toLocaleString()} (${row.totalGainLossPercent.toFixed(1)}%)`}
            color={row.totalGainLoss >= 0 ? "success" : "error"}
            variant="outlined"
            size="small"
          />
        </TableCell>
      </TableRow>

      {/* アコーディオンの中身 */}
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={4}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              {/* 株式のみ: チャートと指標を表示 */}
              {isStock && <StockDetailPanel ticker={row.ticker} />}

              {/* 個別明細リスト */}
              <Typography
                variant="subtitle2"
                gutterBottom
                component="div"
                sx={{ mt: 2, mb: 1, color: "text.secondary" }}
              >
                保有明細
              </Typography>
              <Table size="small" aria-label="purchases">
                <TableHead>
                  <TableRow>
                    <TableCell>口座区分</TableCell>
                    <TableCell align="right">保有数</TableCell>
                    <TableCell align="right">取得単価</TableCell>
                    <TableCell align="right">取得額</TableCell>
                    <TableCell align="right">損益</TableCell>
                    <TableCell align="center">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {row.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell component="th" scope="row">
                        <Box display="flex" alignItems="center">
                          <AccountBadge type={item.account_type || "general"} />
                          {item.is_locked && (
                            <LockIcon
                              sx={{
                                fontSize: 14,
                                ml: 0.5,
                                color: "text.secondary",
                              }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right">{item.shares}</TableCell>
                      <TableCell align="right">
                        {item.currency === "USD" ? "$" : "¥"}
                        {Number(item.acquisition_price).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        ¥{Math.round(item.investmentValue).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="caption"
                          color={
                            item.gainLoss >= 0 ? "success.main" : "error.main"
                          }
                        >
                          {item.gainLoss >= 0 ? "+" : ""}¥
                          {Math.round(item.gainLoss).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, item)}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            if (menuTargetItem) onBuyMore(menuTargetItem);
            handleMenuClose();
          }}
          disabled={menuTargetItem?.is_locked}
        >
          <ListItemIcon>
            <ShoppingCartIcon fontSize="small" />
          </ListItemIcon>
          買い増し
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuTargetItem) onEdit(menuTargetItem);
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          編集
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuTargetItem) onDelete(menuTargetItem);
            handleMenuClose();
          }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          削除
        </MenuItem>
      </Menu>
    </Fragment>
  );
}

export default function AssetTable({
  title,
  data,
  onEdit,
  onBuyMore,
  onDelete,
}: Props) {
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
              {/* 右端の空白セルを削除し、合計幅が100%になるように調整 */}
              <TableCell width="40%">銘柄</TableCell>
              <TableCell align="right" width="20%">
                現在値 / 総数
              </TableCell>
              <TableCell align="right" width="20%">
                評価額 / 元本
              </TableCell>
              <TableCell align="right" width="20%">
                損益
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => (
              <Row
                key={row.ticker}
                row={row}
                onEdit={onEdit}
                onBuyMore={onBuyMore}
                onDelete={onDelete}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
