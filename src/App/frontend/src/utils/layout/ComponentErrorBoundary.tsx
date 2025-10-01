import React, { Component, useEffect } from 'react';

import { NodesInternal } from 'src/utils/layout/NodesContext';

interface IErrorBoundary {
  lastError?: Error;
}

interface Props extends React.PropsWithChildren {
  nodeId: string;
}

export class ComponentErrorBoundary extends Component<Props, IErrorBoundary> {
  constructor(props: Props) {
    super(props);
    this.state = {
      lastError: undefined,
    };
  }

  static getDerivedStateFromError(lastError: Error) {
    return { lastError };
  }

  render() {
    if (this.state.lastError) {
      return (
        <StoreErrorAndBail
          error={this.state.lastError}
          nodeId={this.props.nodeId}
        />
      );
    }

    return this.props.children;
  }
}

function StoreErrorAndBail({ error, nodeId }: { error: Error; nodeId: string }) {
  const addError = NodesInternal.useAddError();

  useEffect(() => {
    window.logError(`Exception thrown when rendering node "${nodeId}":\n`, error);
    addError(error.message, nodeId, 'node');
  }, [addError, error, nodeId]);

  return null;
}
