import * as React from 'react';
import AltinnError from '../shared/components/altinnError';

interface IErrorBoundary {
  hasError: boolean;
  error: Error;
}

class ErrorBoundary extends React.Component<any, IErrorBoundary> {
  private static getDerivedStateFromError(error: Error) {
    return {
      error,
      hasError: true,
    };
  }

  // eslint-disable-next-line react/state-in-constructor
  public state = {
    hasError: false,
    error: null,
  };

  public componentDidCatch(error: Error, info: object) {
    console.error(error, info);
  }

  public render() {
    const { error, hasError } = this.state;
    if (hasError) {
      return (
        <AltinnError
          statusCode='400'
          title='Error'
          content={error}
          url={`${window.location.host}`}
          urlText='Altinn Runtime'
          urlTextSuffix='Altinn Runtime'
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
