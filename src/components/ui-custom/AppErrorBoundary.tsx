import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App render failure', error, errorInfo);
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center px-4 py-16">
          <div className="section-panel w-full max-w-lg px-6 py-10 text-center">
            <p className="section-kicker">Application Error</p>
            <h1 className="heading-display mt-3 text-4xl text-white">Something failed to load</h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              A runtime error interrupted this page. Reload the app to recover the latest production bundle.
            </p>
            <Button onClick={this.handleReload} className="btn-primary mt-6">
              Reload app
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
