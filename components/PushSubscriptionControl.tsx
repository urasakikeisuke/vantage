"use client";

import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import { Button, CircularProgress, Tooltip } from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "./Toast";

type Props = {
  fullWidth?: boolean;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export default function PushSubscriptionControl({ fullWidth }: Props) {
  const { showError, showInfo, showSuccess } = useToast();

  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification === "undefined" ? "default" : Notification.permission,
  );
  const [subscribed, setSubscribed] = useState(false);
  const [endpoint, setEndpoint] = useState<string | null>(null);

  const supported = useMemo(() => {
    if (typeof window === "undefined") return false;
    if (!window.isSecureContext) return false;
    return (
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  }, []);

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

  const getRegistration = useCallback(async () => {
    if (!supported) return null;
    const existing = await navigator.serviceWorker.getRegistration();
    return existing ?? null;
  }, [supported]);

  const syncCurrentSubscription = useCallback(async () => {
    if (!supported) return;
    const reg = await getRegistration();
    if (!reg) {
      setSubscribed(false);
      setEndpoint(null);
      return;
    }

    const sub = await reg.pushManager.getSubscription();
    if (!sub) {
      setSubscribed(false);
      setEndpoint(null);
      return;
    }

    setSubscribed(true);
    setEndpoint(sub.endpoint);
  }, [getRegistration, supported]);

  const saveSubscriptionToSupabase = useCallback(
    async (sub: PushSubscription) => {
      const p256dhKey = sub.getKey("p256dh");
      const authKey = sub.getKey("auth");

      if (!p256dhKey || !authKey) {
        throw new Error("Missing subscription keys");
      }

      const p256dh = arrayBufferToBase64(p256dhKey);
      const auth = arrayBufferToBase64(authKey);

      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh,
          auth,
        },
        { onConflict: "endpoint" },
      );

      if (error) throw error;
    },
    [],
  );

  useEffect(() => {
    if (!supported) return;
    setPermission(Notification.permission);
    void syncCurrentSubscription();
  }, [supported, syncCurrentSubscription]);

  const handleEnable = useCallback(async () => {
    if (!supported) {
      showError("この環境ではプッシュ通知を利用できません");
      return;
    }

    if (!vapidPublicKey) {
      showError("VAPID公開鍵が未設定です（NEXT_PUBLIC_VAPID_PUBLIC_KEY）");
      return;
    }

    setLoading(true);
    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== "granted") {
        showInfo("通知が許可されませんでした");
        return;
      }

      const reg =
        (await navigator.serviceWorker.getRegistration()) ??
        (await navigator.serviceWorker.register("/sw.js"));

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      await saveSubscriptionToSupabase(sub);

      setSubscribed(true);
      setEndpoint(sub.endpoint);
      showSuccess("プッシュ通知を有効化しました");
    } catch (e) {
      console.error(e);
      showError("プッシュ通知の有効化に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [
    saveSubscriptionToSupabase,
    showError,
    showInfo,
    showSuccess,
    supported,
    vapidPublicKey,
  ]);

  const handleDisable = useCallback(async () => {
    if (!supported) return;

    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();

      if (sub) {
        await sub.unsubscribe();

        const supabase = createClient();
        const { error } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);

        if (error) throw error;
      }

      setSubscribed(false);
      setEndpoint(null);
      showSuccess("プッシュ通知を無効化しました");
    } catch (e) {
      console.error(e);
      showError("プッシュ通知の無効化に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [showError, showSuccess, supported]);

  const tooltip = !supported
    ? "HTTPS（またはlocalhost）かつPush対応ブラウザでのみ利用できます"
    : subscribed
      ? endpoint
        ? endpoint
        : "購読済み"
      : "未購読";

  return (
    <Tooltip title={tooltip} placement="top">
      <span>
        <Button
          variant={subscribed ? "outlined" : "contained"}
          size="small"
          color={subscribed ? "inherit" : "primary"}
          startIcon={
            loading ? (
              <CircularProgress size={16} color="inherit" />
            ) : subscribed ? (
              <NotificationsOffIcon />
            ) : (
              <NotificationsActiveIcon />
            )
          }
          onClick={subscribed ? handleDisable : handleEnable}
          disabled={
            !supported || loading || (permission === "denied" && !subscribed)
          }
          fullWidth={fullWidth}
        >
          {subscribed ? "通知: ON" : "通知を有効化"}
        </Button>
      </span>
    </Tooltip>
  );
}
