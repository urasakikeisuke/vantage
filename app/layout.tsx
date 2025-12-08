// app/layout.tsx

import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import type { Metadata, Viewport } from "next";
import theme from "../theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vantage",
  description: "Personal Stock Portfolio Manager",
  icons: {
    icon: [
      { url: "/icons/ios/32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/ios/192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/ios/180.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  initialScale: 1,
  width: "device-width",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body suppressHydrationWarning>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box
              sx={{
                flexGrow: 1,
                minHeight: "100vh",
                bgcolor: "background.default",
              }}
            >
              {/* AppBarは削除し、各ページ側で制御します */}
              <Box component="main">{children}</Box>
            </Box>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
