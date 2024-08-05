import React from 'react';
import type { ErrorInfo } from 'react';

import { DisplayError } from 'src/core/errorHandling/DisplayError';

interface IErrorBoundary {
  lastError?: Error;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, IErrorBoundary> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { lastError: undefined };
  }

  static getDerivedStateFromError(lastError: Error) {
    return { lastError };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(error, errorInfo);
  }

  render() {
    if (this.state.lastError) {
      return <DisplayError error={this.state.lastError} />;
    }

    return this.props.children;
  }
}
