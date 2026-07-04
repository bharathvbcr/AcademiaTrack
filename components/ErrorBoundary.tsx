import React, { Component, ErrorInfo, ReactNode } from 'react';
import { MaterialIcon } from './ApplicationFormUI';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Avoid logging full error objects / component stacks in production (they can
    // contain user-entered values and reveal app structure); keep the message.
    if (process.env.NODE_ENV !== 'production') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    } else {
      console.error('ErrorBoundary caught an error:', error.message);
    }

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Show a system notification in the desktop runtime if available.
    if (window.desktop) {
      try {
        window.desktop.showNotification(
          'Application Error',
          'An error occurred. Please check the console for details.'
        );
      } catch (e) {
        // Ignore notification errors
      }
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#09090b]">
          <div className="max-w-2xl w-full bg-[#18181b] rounded-2xl shadow-xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 bg-red-500/15 rounded-full flex items-center justify-center">
                <MaterialIcon name="error" className="text-red-400 text-2xl" aria-hidden />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#f4f4f5]">
                  Something went wrong
                </h1>
                <p className="text-[#a1a1aa] mt-1">
                  An unexpected error occurred in the application
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="mb-6 p-4 bg-[#09090b] rounded-lg border border-[#27272a]">
                <h2 className="text-sm font-semibold text-[#a1a1aa] mb-2">
                  Error Details
                </h2>
                <pre className="text-xs text-[#a1a1aa] overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack && (
                    <div className="mt-2 pt-2 border-t border-[#27272a]">
                      {this.state.errorInfo.componentStack}
                    </div>
                  )}
                </pre>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-[#dc2626] text-white rounded-lg hover:bg-[#b91c1c] focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:ring-offset-2 focus:ring-offset-[#09090b] transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2 bg-[#27272a] text-[#a1a1aa] rounded-lg hover:bg-[#3f3f46] focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-[#09090b] transition-colors"
              >
                Reload Page
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-[#27272a]">
              <p className="text-sm text-[#a1a1aa]">
                If this problem persists, please check the browser console for more details or contact support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
