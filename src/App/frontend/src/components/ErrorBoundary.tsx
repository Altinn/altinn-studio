import { Component } from 'react';
import type { PropsWithChildren } from 'react';

import { DisplayError } from 'src/core/errorHandling/DisplayError';

interface IErrorBoundary {
  lastError?: Error;
}

export class ErrorBoundary extends Component<PropsWithChildren, IErrorBoundary> {
  constructor(props: PropsWithChildren) {
    super(props);
    this.state = { lastError: undefined };
  }

  static getDerivedStateFromError(lastError: Error) {
    return { lastError };
  }

  render() {
    if (this.state.lastError) {
      return <DisplayError error={this.state.lastError} />;
    }

    return this.props.children;
  }
}
