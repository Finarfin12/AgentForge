'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex items-center justify-center min-h-[200px] text-zinc-500">
          <div className="text-center space-y-2">
            <p className="text-sm">Something went wrong</p>
            <p className="text-xs text-zinc-600">{this.state.error?.message}</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}