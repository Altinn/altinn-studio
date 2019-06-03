import * as React from 'react';

interface IErrorBoundary {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<any, IErrorBoundary> {
  private static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
    };
  }

  public state = {
    hasError: false,
  };

  public componentDidCatch(error: Error, info: object) {
    console.error(error, info);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div>
          <h1>Oh noes! Something bad happened...</h1>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
