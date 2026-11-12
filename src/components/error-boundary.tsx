"use client";

import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Keeps one broken screen from taking down the whole app; offers a safe way back. */
export class ViewErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("ViewErrorBoundary:", error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-sm rounded-3xl border border-amber-500/40 bg-amber-500/5 p-8 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <h2 className="mt-3 text-lg font-black">خطایی غیرمنتظره رخ داد</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            این بخش به‌درستی بارگذاری نشد. می‌توانید دوباره تلاش کنید یا به صفحه اصلی برگردید.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => this.setState({ hasError: false })}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border-2 border-primary/40 bg-primary/10 font-bold text-primary"
            >
              <RotateCcw className="h-4.5 w-4.5" /> تلاش دوباره
            </button>
            <button
              onClick={() => {
                window.location.hash = "#/";
                this.setState({ hasError: false });
              }}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-white"
            >
              <Home className="h-4.5 w-4.5" /> صفحه اصلی
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
