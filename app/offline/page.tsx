"use client";

import { Box, Button, Paper, Typography } from "@mui/material";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 3,
          borderRadius: 2,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          width: "100%",
          maxWidth: 520,
        }}
      >
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          オフラインです
        </Typography>
        <Typography color="text.secondary" mb={2}>
          通信が切断されています。接続が戻ったら再読み込みしてください。
        </Typography>

        <Box display="flex" gap={1} flexWrap="wrap">
          <Button variant="contained" onClick={() => window.location.reload()}>
            再読み込み
          </Button>
          <Button component={Link} href="/" variant="outlined">
            ホームへ
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
