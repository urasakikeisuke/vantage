"use client";

import DeleteIcon from "@mui/icons-material/Delete";
import DoneIcon from "@mui/icons-material/Done";
import MarkunreadIcon from "@mui/icons-material/Markunread";
import {
  Box,
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Popover,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import type { Notification } from "@/types";

type Props = {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onChanged?: () => void;
};

export default function NotificationsDialog({
  anchorEl,
  onClose,
  onChanged,
}: Props) {
  const router = useRouter();
  const open = Boolean(anchorEl);

  const {
    data: notifications,
    mutate,
    isLoading,
  } = useSWR<Notification[]>(
    open ? "notifications" : null,
    () => api.fetchNotifications({ limit: 50 }),
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    if (!open) return;
    void mutate();
  }, [open, mutate]);

  const handleMarkAllRead = useCallback(async () => {
    await api.markAllNotificationsRead();
    await mutate();
    onChanged?.();
  }, [mutate, onChanged]);

  const handleToggleRead = useCallback(
    async (n: Notification) => {
      await api.updateNotificationReadStatus(n.id, !n.is_read);
      await mutate();
      onChanged?.();
    },
    [mutate, onChanged],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await api.deleteNotification(id);
      await mutate();
      onChanged?.();
    },
    [mutate, onChanged],
  );

  const handleOpenNotification = useCallback(
    async (n: Notification) => {
      const url =
        typeof n.data?.url === "string" ? (n.data.url as string) : null;
      if (!n.is_read) {
        await api.updateNotificationReadStatus(n.id, true);
        onChanged?.();
      }
      onClose();
      if (url) router.push(url);
    },
    [router, onClose, onChanged],
  );

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      PaperProps={{
        sx: {
          width: 420,
          maxWidth: "calc(100vw - 16px)",
          maxHeight: "min(70vh, 560px)",
        },
      }}
    >
      <Box
        sx={{
          px: 2,
          pt: 1.5,
          pb: 1,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          gap={1}
        >
          <Typography variant="subtitle1" fontWeight={900}>
            通知
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={() => void handleMarkAllRead()}
          >
            すべて既読
          </Button>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {isLoading ? "読み込み中..." : `${notifications?.length ?? 0}件`}
        </Typography>
      </Box>

      <Box sx={{ overflow: "auto" }}>
        <List dense>
          {(notifications ?? []).map((n) => {
            const data = n.data ?? {};
            const ticker = typeof data.ticker === "string" ? data.ticker : null;
            const name = typeof data.name === "string" ? data.name : null;
            const alertType =
              data.alert_type === "above" || data.alert_type === "below"
                ? (data.alert_type as "above" | "below")
                : null;
            const targetPrice =
              typeof data.target_price === "number" ? data.target_price : null;
            const currentPrice =
              typeof data.current_price === "number"
                ? data.current_price
                : null;

            const isPriceAlert = n.type === "price_alert";
            const displayTitle = isPriceAlert ? "価格アラート" : n.title;

            let displayBody = n.body;
            if (
              isPriceAlert &&
              ticker &&
              alertType &&
              targetPrice &&
              currentPrice
            ) {
              const stockLabel = name ? `${name} (${ticker})` : ticker;
              const directionLabel = alertType === "above" ? "以上" : "以下";
              displayBody = `${stockLabel}\n条件: ¥${Math.round(targetPrice).toLocaleString()} ${directionLabel}\n現在値: ¥${Math.round(currentPrice).toLocaleString()}`;
            }

            return (
              <ListItem
                key={n.id}
                disablePadding
                secondaryAction={
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <IconButton
                      size="small"
                      onClick={() => void handleToggleRead(n)}
                    >
                      {n.is_read ? (
                        <MarkunreadIcon fontSize="small" />
                      ) : (
                        <DoneIcon fontSize="small" />
                      )}
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => void handleDelete(n.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                }
                sx={{ py: 0.75, px: 2 }}
              >
                <Box
                  sx={{ width: "100%", pr: 7, cursor: "pointer" }}
                  onClick={() => void handleOpenNotification(n)}
                >
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={1}
                    flexWrap="wrap"
                  >
                    <Typography
                      variant="body2"
                      fontWeight={n.is_read ? 500 : 900}
                    >
                      {displayTitle}
                    </Typography>
                    <Chip
                      label={n.is_read ? "既読" : "未読"}
                      size="small"
                      variant={n.is_read ? "outlined" : "filled"}
                      color={n.is_read ? "default" : "primary"}
                      sx={{ height: 20, fontSize: "0.65rem" }}
                    />
                  </Box>

                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        color={n.is_read ? "text.secondary" : "text.primary"}
                        sx={{ mt: 0.25, whiteSpace: "pre-line" }}
                      >
                        {displayBody}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {new Date(n.created_at).toLocaleString()}
                      </Typography>
                    }
                  />
                </Box>
              </ListItem>
            );
          })}

          {(notifications?.length ?? 0) === 0 && !isLoading && (
            <Box sx={{ py: 3, px: 2 }}>
              <Typography variant="body2" align="center" color="text.secondary">
                通知はありません
              </Typography>
            </Box>
          )}
        </List>
      </Box>

      <Box
        sx={{
          px: 2,
          py: 1,
          borderTop: 1,
          borderColor: "divider",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Button size="small" onClick={onClose}>
          閉じる
        </Button>
      </Box>
    </Popover>
  );
}
