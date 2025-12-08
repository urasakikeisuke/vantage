// components/HistoryDialog.tsx
"use client";

import RestoreIcon from "@mui/icons-material/Restore";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type LogItem = {
  id: string;
  operation_type: string;
  ticker: string;
  details: string;
  created_at: string;
  // 修正: any を回避
  previous_data: Record<string, unknown> | null;
  portfolio_id: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onRestore: () => void;
};

export default function HistoryDialog({ open, onClose, onRestore }: Props) {
  const supabase = createClient();

  const [logs, setLogs] = useState<LogItem[]>([]);

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from("operation_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) setLogs(data as unknown as LogItem[]);
  }, [supabase.from]);

  useEffect(() => {
    if (open) fetchLogs();
  }, [open, fetchLogs]);

  const handleUndo = async (log: LogItem) => {
    if (!confirm("この操作を取り消して、元の状態に戻しますか？")) return;

    let error = null;

    if (log.operation_type === "add") {
      const { error: delError } = await supabase
        .from("portfolios")
        .delete()
        .eq("id", log.portfolio_id);
      error = delError;
    } else if (log.operation_type === "delete") {
      // 削除の取り消しの場合、previous_dataが必要
      if (log.previous_data) {
        const { error: insError } = await supabase.from("portfolios").insert([
          {
            ...log.previous_data,
            id: log.portfolio_id, // IDを復元
          },
        ]);
        error = insError;
      } else {
        alert("復元データが見つかりません");
        return;
      }
    } else if (
      log.operation_type === "edit" ||
      log.operation_type === "buy_more"
    ) {
      if (log.previous_data) {
        const { error: updError } = await supabase
          .from("portfolios")
          .update(log.previous_data)
          .eq("id", log.portfolio_id);
        error = updError;
      }
    }

    if (error) {
      alert(`取り消しに失敗しました: ${error.message}`);
    } else {
      await supabase.from("operation_logs").delete().eq("id", log.id);
      onRestore();
      fetchLogs();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>操作履歴 (直近20件)</DialogTitle>
      <DialogContent dividers>
        <List>
          {logs.map((log) => (
            <ListItem
              key={log.id}
              secondaryAction={
                <IconButton
                  edge="end"
                  aria-label="restore"
                  onClick={() => handleUndo(log)}
                >
                  <RestoreIcon />
                </IconButton>
              }
            >
              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight="bold" component="div">
                    {log.ticker}
                    <Chip
                      label={
                        log.operation_type === "add"
                          ? "追加"
                          : log.operation_type === "delete"
                            ? "削除"
                            : log.operation_type === "buy_more"
                              ? "買増"
                              : "編集"
                      }
                      size="small"
                      color="default"
                      sx={{ ml: 1, height: 20, fontSize: "0.6rem" }}
                    />
                  </Typography>
                }
                secondary={
                  <>
                    <Typography variant="caption" display="block">
                      {new Date(log.created_at).toLocaleString()}
                    </Typography>
                    {log.details}
                  </>
                }
              />
            </ListItem>
          ))}
          {logs.length === 0 && (
            <Typography variant="body2" align="center" color="text.secondary">
              履歴はありません
            </Typography>
          )}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
      </DialogActions>
    </Dialog>
  );
}
