import { useCallback } from 'react';

import { shouldValidateNode } from 'src/features/validation/StoreValidationsInNode';
import { GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import { NodesStore } from 'src/utils/layout/NodesContext';
import type { ValidationsProcessedLast } from 'src/features/validation';

export function useWaitForNodesToValidate() {
  const registry = GeneratorInternal.useRegistry();
  const nodesStore = NodesStore.useStore();

  return useCallback(
    async (processedLast: ValidationsProcessedLast): Promise<void> => {
      let callbackId: ReturnType<typeof requestIdleCallback | typeof requestAnimationFrame> | undefined;
      const request = window.requestIdleCallback || window.requestAnimationFrame;
      const cancel = window.cancelIdleCallback || window.cancelAnimationFrame;

      function check(): boolean {
        const allNodeData = nodesStore.getState().nodeData;
        const nodeIds = Object.keys(allNodeData);
        for (const nodeId of nodeIds) {
          const nodeData = allNodeData[nodeId];
          if (!nodeData || !('validations' in nodeData) || !shouldValidateNode(nodeData.layout)) {
            // Node does not support validation
            continue;
          }

          const lastValidations = registry.current.validationsProcessed[nodeId];
          const initialIsLatest = lastValidations?.initial === processedLast.initial;
          const incrementalIsLatest = lastValidations?.incremental === processedLast.incremental;
          if (!(lastValidations && initialIsLatest && incrementalIsLatest)) {
            return false;
          }
        }

        return true;
      }

      return new Promise<void>((resolve) => {
        function checkAndResolve() {
          if (check()) {
            resolve();
            callbackId && cancel(callbackId);
          } else {
            callbackId = request(checkAndResolve);
          }
        }

        checkAndResolve();
      });
    },
    [nodesStore, registry],
  );
}
