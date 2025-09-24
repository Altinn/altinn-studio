import { useCallback } from 'react';

import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { shouldValidateNode } from 'src/features/validation/StoreValidationsInNode';
import { GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import { NodesStore } from 'src/utils/layout/NodesContext';
import type { ValidationsProcessedLast } from 'src/features/validation';
import type { CompExternal, CompTypes } from 'src/layout/layout';
import type { NodeData } from 'src/utils/layout/types';

export function useWaitForNodesToValidate() {
  const registry = GeneratorInternal.useRegistry();
  const nodesStore = NodesStore.useStore();
  const lookups = useLayoutLookups();

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
          const layout = lookups.getComponent(nodeData.baseId);
          if (!doesNodeSupportValidation(nodeData, layout)) {
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
    [lookups, nodesStore, registry],
  );
}

function doesNodeSupportValidation<T extends CompTypes>(nodeData: NodeData, layout: CompExternal<T>): boolean {
  return nodeData && 'validations' in nodeData && shouldValidateNode(layout);
}
