// app/sw-init.tsx
"use client";

import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import { Alert, Button, IconButton, Snackbar } from "@mui/material";
import { useEffect, useRef, useState } from "react";

export default function ServiceWorkerInit() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null,
  );
  const [showUpdate, setShowUpdate] = useState(false);
  const reloadingRef = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          if (registration.waiting) {
            setWaitingWorker(registration.waiting);
            setShowUpdate(true);
          }

          registration.addEventListener("updatefound", () => {
            const installing = registration.installing;
            if (!installing) return;

            installing.addEventListener("statechange", () => {
              if (
                installing.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                setWaitingWorker(registration.waiting || installing);
                setShowUpdate(true);
              }
            });
          });
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloadingRef.current) return;
        reloadingRef.current = true;
        window.location.reload();
      });
    }
  }, []);

  const handleApplyUpdate = () => {
    waitingWorker?.postMessage({ type: "SKIP_WAITING" });
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <Snackbar
      open={showUpdate}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      sx={{ bottom: { xs: 140, sm: 90 } }}
    >
      <Alert
        severity="info"
        action={
          <>
            <Button
              color="inherit"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={handleApplyUpdate}
              sx={{ mr: 1 }}
            >
              更新
            </Button>
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={() => setShowUpdate(false)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </>
        }
        sx={{ width: "100%" }}
      >
        新しいバージョンがあります
      </Alert>
    </Snackbar>
  );
}
