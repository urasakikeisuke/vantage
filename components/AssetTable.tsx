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
  useMediaQuery,
  useTheme,
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

type RowMenuProps = {
  anchorEl: HTMLElement | null;
  menuTargetItem: PortfolioRow | null;
  handleMenuClose: () => void;
  onBuyMore: (item: PortfolioRow) => void;
  onEdit: (item: PortfolioRow) => void;
  onDelete: (item: PortfolioRow) => void;
};

// 口座バッジ
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
        sx={{
          ...badgeProps.sx,
          borderColor: "custom.nisaGrowth",
          color: "custom.nisaGrowth",
        }}
      />
    );
  if (type === "nisa_tsumitate")
    return (
      <Chip
        label="NISA積立"
        {...badgeProps}
        sx={{
          ...badgeProps.sx,
          borderColor: "custom.nisaTsumitate",
          color: "custom.nisaTsumitate",
        }}
      />
    );
  if (type === "specific")
    return (
      <Chip
        label="特定"
        {...badgeProps}
        sx={{
          ...badgeProps.sx,
          borderColor: "custom.specific",
          color: "custom.specific",
        }}
      />
    );
  return (
    <Chip
      label="一般"
      {...badgeProps}
      sx={{
        ...badgeProps.sx,
        borderColor: "custom.general",
        color: "custom.general",
      }}
    />
  );
};

// メニュー操作用の共通ロジック
const useRowMenu = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuTargetItem, setMenuTargetItem] = useState<PortfolioRow | null>(
    null,
  );
  const handleMenuOpen = (
    event: MouseEvent<HTMLElement>,
    item: PortfolioRow,
  ) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setMenuTargetItem(item);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuTargetItem(null);
  };
  return { anchorEl, menuTargetItem, handleMenuOpen, handleMenuClose };
};

const GainLossDisplay = ({
  gainLoss,
  afterTaxGain,
  gainLossPercent,
  mode = "desktop",
}: {
  gainLoss: number;
  afterTaxGain: number;
  gainLossPercent: number;
  mode?: "desktop" | "mobile";
}) => {
  const isPositive = gainLoss >= 0;
  const color = isPositive ? "success" : "error";
  const label = `¥${Math.round(afterTaxGain).toLocaleString()} (${gainLossPercent.toFixed(1)}%)`;

  if (mode === "desktop") {
    return <Chip label={label} color={color} variant="outlined" size="small" />;
  }

  return (
    <Box
      mt={1}
      p={0.5}
      bgcolor={isPositive ? "rgba(0, 200, 83, 0.1)" : "rgba(255, 23, 68, 0.1)"}
      borderRadius={1}
      display="flex"
      justifyContent="center"
    >
      <Typography variant="body2" fontWeight="bold" color={`${color}.main`}>
        {isPositive ? "+" : ""}
        {label}
      </Typography>
    </Box>
  );
};

// --- PC用: テーブル行 ---
function DesktopRow({
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
  const { anchorEl, menuTargetItem, handleMenuOpen, handleMenuClose } =
    useRowMenu();
  const isStock = row.type !== "MUTUALFUND";

  return (
    <Fragment>
      <TableRow
        sx={{
          "& > *": { borderBottom: "unset" },
          cursor: "pointer",
          bgcolor: open ? "rgba(255,255,255,0.02)" : "inherit",
          transition: "background-color 0.2s",
          "&:hover": { bgcolor: "rgba(255,255,255,0.04)" },
        }}
        onClick={() => setOpen(!open)}
      >
        <TableCell width="40%">
          <Box display="flex" alignItems="center">
            <IconButton
              aria-label="expand row"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(!open);
              }}
            >
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
            <Box ml={1} sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="body1"
                fontWeight="bold"
                sx={{
                  display: "-webkit-box",
                  overflow: "hidden",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 2,
                  lineHeight: 1.2,
                  maxHeight: "2.4em",
                }}
              >
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
        <TableCell align="right" width="20%">
          <Box display="flex" flexDirection="column" alignItems="flex-end">
            <Typography variant="body2" fontWeight="bold">
              ¥{Math.round(row.totalCurrentValue).toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ¥{Math.round(row.totalInvestmentValue).toLocaleString()}
            </Typography>
          </Box>
        </TableCell>
        <TableCell align="right" width="20%">
          <GainLossDisplay
            gainLoss={row.totalGainLoss}
            afterTaxGain={row.totalAfterTaxGain}
            gainLossPercent={row.totalGainLossPercent}
            mode="desktop"
          />
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={4}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            {/* アコーディオン展開部分 */}
            <Box
              sx={{
                margin: 2,
                pl: 2,
                // スタイリッシュな左線
                borderLeft: "4px solid",
                borderLeftColor: "custom.accent",
                boxShadow: (theme) =>
                  `-4px 0 8px -4px ${theme.palette.custom.accent}4D`, // 4D = 30% alpha
              }}
            >
              {isStock && <StockDetailPanel ticker={row.ticker} />}

              <Typography
                variant="subtitle2"
                gutterBottom
                component="div"
                sx={{ mt: 2, mb: 1, color: "text.secondary" }}
              >
                保有明細
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>口座</TableCell>
                    <TableCell align="right">数</TableCell>
                    <TableCell align="right">単価</TableCell>
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

      <RowMenu
        anchorEl={anchorEl}
        menuTargetItem={menuTargetItem}
        handleMenuClose={handleMenuClose}
        onBuyMore={onBuyMore}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </Fragment>
  );
}

// --- スマホ用: カード行 ---
function MobileCard({
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
  const { anchorEl, menuTargetItem, handleMenuOpen, handleMenuClose } =
    useRowMenu();
  const isStock = row.type !== "MUTUALFUND";

  return (
    <Paper
      sx={{
        mb: 2,
        overflow: "hidden",
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      {/* ヘッダー部分 (タップで開閉) */}
      <Box
        p={2}
        onClick={() => setOpen(!open)}
        sx={{
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Box sx={{ flex: 1, mr: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold" lineHeight={1.3}>
              {row.name}
            </Typography>
            <Box display="flex" gap={1} mt={0.5} alignItems="center">
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
          <IconButton size="small" sx={{ mt: -0.5, mr: -0.5 }}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </Box>

        {/* データグリッド (3カラム) */}
        <Box display="grid" gridTemplateColumns="1fr 1fr 1fr" gap={1} mt={1}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              現在値
            </Typography>
            <Typography variant="body2">
              ¥{Math.round(row.currentPrice).toLocaleString()}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              保有数
            </Typography>
            <Typography variant="body2">
              {row.type === "MUTUALFUND"
                ? row.totalShares.toLocaleString()
                : row.totalShares}
            </Typography>
          </Box>
          <Box textAlign="right">
            <Typography variant="caption" color="text.secondary">
              評価額
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              ¥{Math.round(row.totalCurrentValue).toLocaleString()}
            </Typography>
          </Box>
        </Box>

        {/* 損益バー */}
        <GainLossDisplay
          gainLoss={row.totalGainLoss}
          afterTaxGain={row.totalAfterTaxGain}
          gainLossPercent={row.totalGainLossPercent}
          mode="mobile"
        />
      </Box>

      {/* 展開部分 */}
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box
          sx={{
            p: 2,
            borderTop: "1px solid",
            borderColor: "divider",
            bgcolor: "rgba(255,255,255,0.02)",
            // スタイリッシュな左線 (スマホ版)
            borderLeft: "4px solid",
            borderLeftColor: "custom.accent",
          }}
        >
          {isStock && <StockDetailPanel ticker={row.ticker} />}

          <Typography
            variant="subtitle2"
            gutterBottom
            sx={{ mt: 2, mb: 1, color: "text.secondary", fontSize: "0.8rem" }}
          >
            保有明細
          </Typography>

          {/* スマホ用明細リスト */}
          <Box display="flex" flexDirection="column" gap={1}>
            {row.items.map((item) => (
              <Paper
                key={item.id}
                sx={{ p: 1, bgcolor: "rgba(0,0,0,0.2)" }}
                variant="outlined"
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={0.5}
                >
                  <Box display="flex" alignItems="center">
                    <AccountBadge type={item.account_type || "general"} />
                    {item.is_locked && (
                      <LockIcon
                        sx={{
                          fontSize: 12,
                          ml: 0.5,
                          color: "text.secondary",
                        }}
                      />
                    )}
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, item)}
                    sx={{ p: 0.5 }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  fontSize="0.8rem"
                >
                  <span style={{ color: "#888" }}>
                    {item.shares}株 @ ¥
                    {Math.round(item.investmentValue).toLocaleString()}
                  </span>
                  <span
                    style={{
                      color: item.gainLoss >= 0 ? "#66bb6a" : "#f44336",
                    }}
                  >
                    {item.gainLoss >= 0 ? "+" : ""}¥
                    {Math.round(item.gainLoss).toLocaleString()}
                  </span>
                </Box>
              </Paper>
            ))}
          </Box>
        </Box>
      </Collapse>

      <RowMenu
        anchorEl={anchorEl}
        menuTargetItem={menuTargetItem}
        handleMenuClose={handleMenuClose}
        onBuyMore={onBuyMore}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </Paper>
  );
}

// 共通メニュー
function RowMenu({
  anchorEl,
  menuTargetItem,
  handleMenuClose,
  onBuyMore,
  onEdit,
  onDelete,
}: RowMenuProps) {
  return (
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
  );
}

export default function AssetTable({
  title,
  data,
  onEdit,
  onBuyMore,
  onDelete,
}: Props) {
  const theme = useTheme();
  // sm (600px) 以下をモバイルとみなす
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  if (data.length === 0) return null;

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mt: 2 }}>
        {title}
      </Typography>

      {/* モバイル: カードリスト表示 */}
      {isMobile ? (
        <Box>
          {data.map((row) => (
            <MobileCard
              key={row.ticker}
              row={row}
              onEdit={onEdit}
              onBuyMore={onBuyMore}
              onDelete={onDelete}
            />
          ))}
        </Box>
      ) : (
        /* PC: テーブル表示 */
        <TableContainer
          component={Paper}
          elevation={3}
          sx={{ bgcolor: "background.paper" }}
        >
          <Table>
            <TableHead>
              <TableRow>
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
                <DesktopRow
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
      )}
    </Box>
  );
}
