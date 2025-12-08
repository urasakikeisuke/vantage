// app/login/page.tsx
"use client";

import GitHubIcon from "@mui/icons-material/GitHub"; // 追加
import {
  Alert,
  Button,
  Card,
  CardContent,
  Container,
  Divider, // 追加
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const router = useRouter();
  const supabase = createClient();

  // メール認証処理
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        setMessage({
          type: "success",
          text: "登録が完了しました！自動的にログインします...",
        });

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (!signInError) {
          router.push("/");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        router.push("/");
        router.refresh();
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // GitHubログイン処理
  const handleGitHubLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          // ログイン後のリダイレクト先
          redirectTo: `${location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      // OAuthは自動的にリダイレクトされるので、ここで処理は終了
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 15 }}>
      <Card sx={{ p: 2, borderRadius: 2, boxShadow: 3 }}>
        <CardContent>
          <Typography
            variant="h5"
            align="center"
            fontWeight="bold"
            gutterBottom
          >
            Vantage
          </Typography>

          <Tabs
            value={isSignUp ? 1 : 0}
            onChange={(_, val) => {
              setIsSignUp(val === 1);
              setMessage(null);
            }}
            variant="fullWidth"
            sx={{ mb: 3 }}
          >
            <Tab label="ログイン" />
            <Tab label="新規登録" />
          </Tabs>

          {message && (
            <Alert severity={message.type} sx={{ mb: 2 }}>
              {message.text}
            </Alert>
          )}

          <form onSubmit={handleAuth}>
            <TextField
              label="メールアドレス"
              type="email"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              label="パスワード"
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              helperText={isSignUp ? "6文字以上で入力してください" : ""}
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mb: 3 }}
            >
              {loading
                ? "処理中..."
                : isSignUp
                  ? "登録してログイン"
                  : "ログイン"}
            </Button>
          </form>

          <Divider sx={{ mb: 3 }}>または</Divider>

          <Button
            variant="outlined"
            fullWidth
            size="large"
            startIcon={<GitHubIcon />}
            onClick={handleGitHubLogin}
            disabled={loading}
            sx={{
              color: "text.primary",
              borderColor: "#ccc",
              "&:hover": {
                borderColor: "#999",
                bgcolor: "rgba(0,0,0,0.05)",
              },
            }}
          >
            GitHubでログイン
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
}
