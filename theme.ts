// theme.ts
"use client";

import { createTheme } from "@mui/material/styles";
import { Roboto } from "next/font/google";

// Google Fontsの読み込み（MUI標準のRobotoフォント）
const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

const theme = createTheme({
  // カラーパレット設定
  palette: {
    mode: "dark", // ダークモードにする
    primary: {
      main: "#90caf9", // 薄い青（アクセント）
    },
    secondary: {
      main: "#f48fb1", // 薄いピンク
    },
    background: {
      default: "#0a1929", // 非常に濃い紺色（金融アプリっぽい背景）
      paper: "#132f4c", // カードなどの背景色
    },
    // 株価用のカスタムカラー（後で使います）
    success: {
      main: "#4caf50", // 上昇（緑）
    },
    error: {
      main: "#f44336", // 下落（赤）
    },
  },
  // フォント設定
  typography: {
    fontFamily: roboto.style.fontFamily,
    h1: { fontSize: "2rem", fontWeight: 700 },
    h2: { fontSize: "1.5rem", fontWeight: 600 },
  },
  // コンポーネントのデフォルトスタイル調整
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: "#6b6b6b #2b2b2b",
          "&::-webkit-scrollbar, & *::-webkit-scrollbar": {
            backgroundColor: "#2b2b2b",
          },
          "&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb": {
            borderRadius: 8,
            backgroundColor: "#6b6b6b",
            minHeight: 24,
            border: "3px solid #2b2b2b",
          },
        },
      },
    },
  },
});

export default theme;
