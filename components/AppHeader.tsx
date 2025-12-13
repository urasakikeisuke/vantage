// components/AppHeader.tsx
"use client";

import HistoryIcon from "@mui/icons-material/History";
import LogoutIcon from "@mui/icons-material/Logout";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  AppBar,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  onRefresh: () => void;
  onOpenHistory: () => void;
};

export default function AppHeader({ onRefresh, onOpenHistory }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Toolbar>
        <Typography
          variant="h6"
          component="div"
          sx={{ flexGrow: 1, fontWeight: "bold", color: "primary.main" }}
        >
          Vantage
        </Typography>

        <Tooltip title="最新価格に更新">
          <IconButton color="primary" onClick={onRefresh}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="操作履歴">
          <IconButton color="primary" onClick={onOpenHistory} sx={{ ml: 1 }}>
            <HistoryIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="ログアウト">
          <IconButton color="primary" onClick={handleLogout} sx={{ ml: 1 }}>
            <LogoutIcon />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
