'use client';

import React, { Component, ErrorInfo, ReactNode, useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    this.props.onError?.(error, errorInfo);

    console.error(`[ErrorBoundary: ${this.props.name || 'Unknown'}]`, error, errorInfo);

    if (typeof window !== 'undefined' && window.navigator?.sendBeacon) {
      try {
        const payload = JSON.stringify({
          name: this.props.name,
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        });
        navigator.sendBeacon('/api/errors', payload);
      } catch {
        // Silently fail - error reporting should never break the app
      }
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  private handleCopyError = () => {
    if (!this.state.error) return;
    const text = `${this.state.error.message}\n\n${this.state.error.stack}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack}`;
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'Error copied to clipboard', description: 'You can paste this when reporting the issue.' });
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[300px] flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-destructive/30 bg-destructive/5">
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 p-3 rounded-full bg-destructive/10 w-12 h-12 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-lg">Something went wrong</CardTitle>
              <CardDescription className="text-muted-foreground">
                {this.props.name ? `In ${this.props.name}: ` : ''}
                {this.state.error?.message || 'An unexpected error occurred'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <details className="text-left">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                  Show technical details
                </summary>
                <pre className="mt-2 p-3 text-xs bg-muted rounded overflow-x-auto text-muted-foreground max-h-40 overflow-y-auto">
                  {this.state.error?.message}
                  {this.state.error?.stack}
                  {this.state.errorInfo?.componentStack && `\n\nComponent Stack:\n${this.state.errorInfo.componentStack}`}
                </pre>
              </details>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={this.handleCopyError}>
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy Error
                </Button>
                <Button variant="secondary" size="sm" onClick={this.handleRetry}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Try Again
                </Button>
                <Button variant="outline" size="sm" onClick={this.handleHome}>
                  <Home className="h-3.5 w-3.5 mr-1.5" />
                  Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Convenience wrapper for async error boundaries
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps} name={WrappedComponent.displayName || WrappedComponent.name || 'Component'}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

// Hook version for functional components
export function useErrorHandler() {
  const [error, setError] = useState<Error | null>(null);

  const handleError = useCallback((err: Error) => {
    setError(err);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
}

// Simple fallback components for specific sections
export const CalculatorErrorFallback = () => (
  <div className="p-4 text-center">
    <AlertTriangle className="mx-auto h-8 w-8 text-destructive/50 mb-2" />
    <p className="text-sm text-muted-foreground">Calculator unavailable</p>
    <p className="text-xs text-muted-foreground/70 mt-1">Please refresh the page to try again</p>
  </div>
);

export const InteractionCheckerErrorFallback = () => (
  <div className="p-4 text-center">
    <AlertTriangle className="mx-auto h-8 w-8 text-destructive/50 mb-2" />
    <p className="text-sm text-muted-foreground">Interaction checker unavailable</p>
    <p className="text-xs text-muted-foreground/70 mt-1">Try again or visit TripSit.me directly</p>
  </div>
);

export const DoseLoggerErrorFallback = () => (
  <div className="p-4 text-center">
    <AlertTriangle className="mx-auto h-8 w-8 text-destructive/50 mb-2" />
    <p className="text-sm text-muted-foreground">Dose logger unavailable</p>
    <p className="text-xs text-muted-foreground/70 mt-1">Your data is safe in local storage</p>
  </div>
);

export const AnalyticsErrorFallback = () => (
  <div className="p-4 text-center">
    <AlertTriangle className="mx-auto h-8 w-8 text-destructive/50 mb-2" />
    <p className="text-sm text-muted-foreground">Analytics unavailable</p>
    <p className="text-xs text-muted-foreground/70 mt-1">Dose data is preserved locally</p>
  </div>
);

export const SubstanceDetailErrorFallback = () => (
  <div className="p-4 text-center">
    <AlertTriangle className="mx-auto h-8 w-8 text-destructive/50 mb-2" />
    <p className="text-sm text-muted-foreground">Substance details unavailable</p>
    <p className="text-xs text-muted-foreground/70 mt-1">Try searching for another substance</p>
  </div>
);