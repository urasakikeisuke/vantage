// components/PWAInstallPrompt.tsx
"use client";

import CloseIcon from "@mui/icons-material/Close";
import GetAppIcon from "@mui/icons-material/GetApp";
import { Alert, Button, IconButton, Snackbar } from "@mui/material";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // 初回訪問から1日後、または3回目の訪問で表示
      const installPromptShown = localStorage.getItem("installPromptShown");
      const visitCount = parseInt(
        localStorage.getItem("visitCount") || "0",
        10,
      );

      if (!installPromptShown && visitCount >= 3) {
        setShowPrompt(true);
      }

      localStorage.setItem("visitCount", (visitCount + 1).toString());
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("PWA installed");
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
    localStorage.setItem("installPromptShown", "true");
  };

  const handleClose = () => {
    setShowPrompt(false);
    localStorage.setItem("installPromptShown", "true");
  };

  if (!showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <Snackbar
      open={showPrompt}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      sx={{ bottom: { xs: 80, sm: 24 } }}
    >
      <Alert
        severity="info"
        action={
          <>
            <Button
              color="inherit"
              size="small"
              startIcon={<GetAppIcon />}
              onClick={handleInstall}
              sx={{ mr: 1 }}
            >
              インストール
            </Button>
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={handleClose}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </>
        }
        sx={{ width: "100%" }}
      >
        アプリをホーム画面に追加して、より快適に利用できます
      </Alert>
    </Snackbar>
  );
}
