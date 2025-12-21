// theme.ts
import { createTheme } from "@mui/material/styles";

// カスタムパレットの型定義拡張
declare module "@mui/material/styles" {
  interface Palette {
    custom: {
      nisaGrowth: string;
      nisaTsumitate: string;
      specific: string;
      general: string;
      accent: string;
    };
  }
  interface PaletteOptions {
    custom?: {
      nisaGrowth?: string;
      nisaTsumitate?: string;
      specific?: string;
      general?: string;
      accent?: string;
    };
  }
}

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
    // カスタムカラー
    custom: {
      nisaGrowth: "#BA68C8",
      nisaTsumitate: "#29B6F6",
      specific: "#2979FF",
      general: "#607D8B",
      accent: "#00E5FF",
    },
  },
  // フォント設定
  typography: {
    fontFamily:
      "var(--font-roboto), system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
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
