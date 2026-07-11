import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-darkBg text-white p-6">
          <div className="max-w-md w-full bg-gray-950 p-8 rounded-3xl border border-red-500/20 text-center space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold text-red-400">Something went wrong</h2>
            <p className="text-xs text-gray-400 leading-relaxed font-mono bg-black/40 p-4 rounded-2xl text-left overflow-auto max-h-60">
              {this.state.error?.toString()}
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-xs font-bold rounded-xl transition"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
