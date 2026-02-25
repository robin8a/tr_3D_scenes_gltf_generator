
import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-8 text-center bg-gray-900 min-h-screen flex items-center justify-center">
          <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-8 max-w-lg">
            <h2 className="text-red-400 font-bold text-2xl mb-4">Something went wrong</h2>
            <p className="text-gray-300 mb-6">
              The application encountered an unexpected error. This might be due to WebGL limitations in your environment.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Reload Page
            </button>
            {this.state.error && (
              <pre className="mt-6 p-4 bg-black/50 rounded text-xs text-red-300 overflow-auto text-left">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
