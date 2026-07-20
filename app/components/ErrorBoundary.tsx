"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "clamp(24px, 5vw, 64px)",
            textAlign: "center",
            fontFamily: `Inter, "PingFang SC", sans-serif`,
            color: "var(--ink, #17211b)",
            background: "var(--paper, #fcfdfb)",
          }}
        >
          <h1
            style={{
              fontSize: "clamp(32px, 4vw, 48px)",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              margin: "0 0 16px",
            }}
          >
            页面加载出错
          </h1>
          <p
            style={{
              color: "var(--muted, #68736b)",
              fontSize: "16px",
              lineHeight: 1.8,
              margin: "0 0 32px",
            }}
          >
            请刷新页面重试
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 32px",
              border: "none",
              borderRadius: "8px",
              background: "var(--green, #1f6f4a)",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "background-color 0.2s ease",
            }}
          >
            刷新页面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
