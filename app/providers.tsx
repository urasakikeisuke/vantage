// app/providers.tsx
"use client";

import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import type { ReactNode } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { ToastProvider } from "@/components/Toast";
import theme from "@/theme";
import ServiceWorkerInit from "./sw-init";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ErrorBoundary>
          <ToastProvider>
            <Box
              sx={{
                flexGrow: 1,
                minHeight: "100vh",
                bgcolor: "background.default",
              }}
            >
              <Box component="main">{children}</Box>
            </Box>
            <ServiceWorkerInit />
            <PWAInstallPrompt />
          </ToastProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
