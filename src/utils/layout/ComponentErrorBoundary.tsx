import React, { Component, useEffect } from 'react';

import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface IErrorBoundary {
  lastError?: Error;
}

interface Props extends React.PropsWithChildren {
  node: LayoutNode;
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
          node={this.props.node}
        />
      );
    }

    return this.props.children;
  }
}

function StoreErrorAndBail({ error, node }: { error: Error; node: LayoutNode }) {
  const addError = NodesInternal.useAddError();

  useEffect(() => {
    window.logError(`Exception thrown when rendering node "${node.id}":\n`, error);
    addError(error.message, node);
  }, [addError, error, node]);

  return null;
}
