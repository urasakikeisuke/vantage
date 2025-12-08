// components/DividendCard.tsx
"use client";

import PaidIcon from "@mui/icons-material/Paid";
import {
  Box,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";

type DividendItem = {
  name: string;
  amount: number; // 年間受取額（円）
  yield: number; // 利回り（%）
};

type Props = {
  totalDividend: number; // 年間配当総額
  yieldOnCost: number; // 取得単価に対する利回り
  topPayer: DividendItem[]; // 配当の多い銘柄ランキング
};

export default function DividendCard({
  totalDividend,
  yieldOnCost,
  topPayer,
}: Props) {
  return (
    <Card sx={{ height: "100%", bgcolor: "background.paper", borderRadius: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <PaidIcon color="secondary" sx={{ mr: 1 }} />
          <Typography variant="subtitle2" color="text.secondary">
            年間配当金 (予想)
          </Typography>
        </Box>

        <Box sx={{ mb: 3, textAlign: "center" }}>
          <Typography variant="h4" fontWeight="bold" color="secondary.main">
            ¥{Math.round(totalDividend).toLocaleString()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            配当利回り(簿価): {yieldOnCost.toFixed(2)}%
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 1, display: "block" }}
        >
          配当貢献度トップ3
        </Typography>

        <List dense disablePadding>
          {topPayer.map((item) => (
            <ListItem key={item.name} disableGutters>
              <ListItemText
                primary={item.name}
                primaryTypographyProps={{ variant: "body2", noWrap: true }}
              />
              <Typography variant="body2" fontWeight="bold">
                ¥{Math.round(item.amount).toLocaleString()}
              </Typography>
            </ListItem>
          ))}
          {topPayer.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              配当情報がありません
            </Typography>
          )}
        </List>
      </CardContent>
    </Card>
  );
}
