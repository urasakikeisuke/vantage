"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

export default function MotionWrapper({ children, className = "" }: Props) {
  return <div className={className}>{children}</div>;
}
