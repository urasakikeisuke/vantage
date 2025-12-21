// components/AppHeader.tsx
"use client";

import HistoryIcon from "@mui/icons-material/History";
import LogoutIcon from "@mui/icons-material/Logout";
import NotificationsIcon from "@mui/icons-material/Notifications";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  AppBar,
  Badge,
  IconButton,
  LinearProgress,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  onRefresh: () => void;
  onOpenHistory: () => void;
  onOpenNotifications: (anchorEl: HTMLElement) => void;
  unreadNotificationCount?: number;
  refreshIndicator?: {
    progress: number;
    refreshing: boolean;
  };
};

export default function AppHeader({
  onRefresh,
  onOpenHistory,
  onOpenNotifications,
  unreadNotificationCount,
  refreshIndicator,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const isRefreshing =
    !!refreshIndicator &&
    (refreshIndicator.refreshing || refreshIndicator.progress > 0);

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
          <IconButton
            color="primary"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="操作履歴">
          <IconButton color="primary" onClick={onOpenHistory} sx={{ ml: 1 }}>
            <HistoryIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title="通知">
          <IconButton
            color="primary"
            onClick={(e: MouseEvent<HTMLElement>) =>
              onOpenNotifications(e.currentTarget)
            }
            sx={{ ml: 1 }}
          >
            <Badge
              color="error"
              badgeContent={unreadNotificationCount || 0}
              invisible={!unreadNotificationCount}
            >
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Tooltip>

        <Tooltip title="ログアウト">
          <IconButton color="primary" onClick={handleLogout} sx={{ ml: 1 }}>
            <LogoutIcon />
          </IconButton>
        </Tooltip>
      </Toolbar>

      {refreshIndicator &&
        (refreshIndicator.refreshing || refreshIndicator.progress > 0) && (
          <LinearProgress
            {...(refreshIndicator.refreshing
              ? { variant: "indeterminate" as const }
              : {
                  variant: "determinate" as const,
                  value: refreshIndicator.progress,
                })}
            sx={{
              height: 3,
              bgcolor: "rgba(255,255,255,0.08)",
              "& .MuiLinearProgress-bar": {
                bgcolor: "custom.accent",
              },
            }}
          />
        )}
    </AppBar>
  );
}
