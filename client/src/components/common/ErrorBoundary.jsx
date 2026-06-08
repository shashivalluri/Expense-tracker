import React, { Component } from 'react';
import GlassCard from './GlassCard';
import { AlertOctagon, RotateCcw } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service here
    console.error('[Error Boundary Triggered]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f5f7fb] dark:bg-[#060713] flex items-center justify-center p-6 transition-colors">
          {/* Ambient Glows */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 ambient-glow-indigo rounded-full pointer-events-none" />
          
          <GlassCard className="p-8 max-w-lg w-full text-center relative border-rose-500/30 shadow-2xl">
            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-5 text-rose-500">
              <AlertOctagon size={36} />
            </div>

            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3">
              Something went wrong
            </h1>
            
            <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium">
              An unexpected application error occurred. Don't worry, your financial ledger data is safe. Let's restart the workspace application.
            </p>

            {this.state.error && (
              <div className="text-left bg-slate-900/10 dark:bg-black/40 text-xs text-rose-500 dark:text-rose-400 font-mono p-4 rounded-xl mb-6 overflow-x-auto max-h-32 border border-slate-300 dark:border-slate-800 custom-scrollbar">
                {this.state.error.toString()}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="glass-btn-primary mx-auto"
            >
              <RotateCcw size={18} />
              Reset Application
            </button>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
