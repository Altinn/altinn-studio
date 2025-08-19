import { useRef } from 'react';
import type { PropsWithChildren, SetStateAction } from 'react';

import { GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { ValidationsProcessedLast } from 'src/features/validation';
import type { AddNodeRequest, RemoveNodeRequest, SetNodePropRequest } from 'src/utils/layout/NodesContext';

/**
 * The registry is a collection of state kept in a ref, and is used to keep track of the progress in the node generator.
 * Consider it an 'inner workings' state store that is frequently updated. Since it is stored in a ref, it cannot be
 * reactive.
 */
export type Registry = {
  triggerAutoCommit: ((value: SetStateAction<number>) => void) | undefined;
  validationsProcessed: {
    [nodeId: string]: ValidationsProcessedLast;
  };
  toCommit: {
    addNodeRequests: AddNodeRequest[];
    removeNodeRequests: RemoveNodeRequest[];
    nodePropsRequests: SetNodePropRequest[];
  };
};

/**
 * Creates a new registry for the generator. Instead of using this hook directly, you'll probably want to
 * get it from:
 * @see GeneratorInternal.useRegistry
 */
export function useRegistry() {
  return useRef<Registry>({
    triggerAutoCommit: undefined,
    validationsProcessed: {},
    toCommit: {
      addNodeRequests: [],
      removeNodeRequests: [],
      nodePropsRequests: [],
    },
  });
}

/**
 * A component you can wrap around your own components to make sure they only run when the generator has reached a
 * certain stage, and optionally only if a certain condition is met.
 */
export function WhenParentAdded({ children }: PropsWithChildren) {
  const parent = GeneratorInternal.useParent();
  const ready = NodesInternal.useIsAdded(parent.indexedId, parent.type);

  return ready ? children : null;
}
