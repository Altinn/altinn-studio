import React, { Component, useEffect } from 'react';
import type { MutableRefObject, PropsWithChildren } from 'react';

import { NodesInternal } from 'src/utils/layout/NodesContext';

interface IErrorBoundary extends ContextData {
  lastError?: Error;
}

export class GeneratorErrorBoundary extends Component<PropsWithChildren, IErrorBoundary> {
  constructor(props: PropsWithChildren) {
    super(props);
    this.state = {
      lastError: undefined,
      ref: { current: undefined },
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
          ref={this.state.ref.current}
        />
      );
    }

    return <Context.Provider value={{ ref: this.state.ref }}>{this.props.children}</Context.Provider>;
  }
}

type Ref = { type: 'node' | 'page'; id: string } | undefined;

interface ContextData {
  ref: MutableRefObject<Ref>;
}

const Context = React.createContext<ContextData>({
  ref: { current: undefined },
});

export function useGeneratorErrorBoundaryNodeRef() {
  return React.useContext(Context).ref;
}

function StoreErrorAndBail({ error, ref }: { error: Error; ref: Ref }) {
  const addError = NodesInternal.useAddError();

  useEffect(() => {
    if (!ref) {
      window.logError('Exception thrown when generating unknown node:\n', error);
    } else if (ref.type === 'node') {
      addError(error.message, ref.id, 'node');
      window.logError(`Exception thrown when generating node "${ref.id}":\n`, error);
    } else {
      addError(error.message, ref.id, 'page');
      window.logError(`Exception thrown when generating page "${ref.id}":\n`, error);
    }
  }, [addError, error, ref]);

  return null;
}
