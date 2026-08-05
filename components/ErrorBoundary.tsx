'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Panel Error Boundary Caught]', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 text-center my-4">
          <h3 className="text-sm font-bold text-danger mb-1">Panel Error</h3>
          <p className="text-xs text-textMuted mb-3">
            {this.state.error?.message || 'Failed to render section.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1 bg-danger/20 border border-danger/40 text-danger text-xs rounded-lg hover:bg-danger/30 transition"
          >
            Retry Panel
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
