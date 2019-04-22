import * as React from 'react';

interface IErrorBoundry {
  hasError: boolean;
}

class ErrorBoundry extends React.Component<any, IErrorBoundry> {
  private static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
    };
  }

  public state = {
    hasError: false,
  };

  public componentDidCatch(error: Error, info: any) {
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

export default ErrorBoundry;
