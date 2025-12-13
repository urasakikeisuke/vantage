"use client";

import { Box, CircularProgress } from "@mui/material";
import { type ReactNode, useEffect, useRef, useState } from "react";

type Props = {
  children: ReactNode;
  onRefresh: () => Promise<void>;
};

export default function PullToRefresh({ children, onRefresh }: Props) {
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // 引っ張れる最大距離と、更新発動の閾値
  const MAX_PULL = 120;
  const THRESHOLD = 80;

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // 画面の一番上にいるときだけ有効
      if (window.scrollY === 0) {
        setStartY(e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // 更新中や、スクロール途中なら無視
      if (refreshing || window.scrollY > 0 || startY === 0) return;

      const y = e.touches[0].clientY;
      const diff = y - startY;

      // 下方向へのドラッグのみ反応
      if (diff > 0) {
        // スクロールを無効化して引っ張りUIを見せる
        if (e.cancelable) e.preventDefault();
        // 抵抗感（減衰）をつける
        setCurrentY(Math.min(diff * 0.5, MAX_PULL));
      }
    };

    const handleTouchEnd = async () => {
      if (refreshing || startY === 0) return;

      if (currentY > THRESHOLD) {
        setRefreshing(true);
        setCurrentY(THRESHOLD); // ローディング位置で固定
        try {
          await onRefresh();
        } finally {
          // 少し待ってから戻す（完了した感を見せるため）
          setTimeout(() => {
            setRefreshing(false);
            setCurrentY(0);
          }, 500);
        }
      } else {
        // 閾値に満たない場合は戻す
        setCurrentY(0);
      }
      setStartY(0);
    };

    const element = contentRef.current;
    if (!element) return;

    // パッシブリスナーをオフにして preventDefault を有効にする
    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: false });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, [startY, currentY, refreshing, onRefresh]);

  return (
    <div
      ref={contentRef}
      style={{
        minHeight: "100vh",
        // 引っ張りアニメーション
        transition: refreshing
          ? "transform 0.3s ease"
          : "transform 0.1s ease-out",
        transform: `translateY(${currentY}px)`,
      }}
    >
      {/* ローディングインジケータ (画面外の上部に配置) */}
      <Box
        sx={{
          position: "absolute",
          top: -60,
          left: 0,
          right: 0,
          height: 60,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          opacity: currentY > 0 ? 1 : 0,
        }}
      >
        <CircularProgress
          size={24}
          color="secondary" // テーマカラー(紫)
          // 引っ張り具合に応じて回転させる演出
          variant={refreshing ? "indeterminate" : "determinate"}
          value={
            refreshing ? undefined : Math.min((currentY / THRESHOLD) * 100, 100)
          }
        />
      </Box>

      {children}
    </div>
  );
}
