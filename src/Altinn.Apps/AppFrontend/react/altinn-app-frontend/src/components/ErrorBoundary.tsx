import * as React from 'react';
import UnknownError from 'src/features/instantiate/containers/UnknownError';

interface IErrorBoundary {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<any, IErrorBoundary> {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return  <UnknownError />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
