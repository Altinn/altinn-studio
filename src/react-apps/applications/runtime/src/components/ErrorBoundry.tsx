import * as React from 'react';

interface IErrorBoundry {
  hasError: boolean;
}

class ErrorBoundry extends React.Component<any, IErrorBoundry> {
  state = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
    }
  }

  componentDidCatch(error: Error, info: any) {
    console.error(error, info);
  }

  render() {
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