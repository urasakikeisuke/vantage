// components/ErrorBoundary.tsx
"use client";

import { Alert, Box, Button, Container, Typography } from "@mui/material";
import { Component, type ReactNode } from "react";
import { logError } from "@/lib/errors";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError(error, { errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Container maxWidth="sm" sx={{ mt: 8 }}>
          <Box textAlign="center">
            <Alert severity="error" sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                エラーが発生しました
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {this.state.error?.message || "予期しないエラーが発生しました"}
              </Typography>
            </Alert>
            <Button variant="contained" onClick={this.handleReset}>
              ページを再読み込み
            </Button>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}
