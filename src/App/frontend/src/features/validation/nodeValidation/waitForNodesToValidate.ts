import { useCallback } from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { FormBootstrap } from 'src/features/formBootstrap/FormBootstrap';
import { shouldValidateNode } from 'src/features/validation/StoreValidationsInNode';
import { GeneratorInternal } from 'src/utils/layout/generator/GeneratorContext';
import type { CompExternal, CompTypes } from 'src/layout/layout';
import type { NodeData } from 'src/utils/layout/types';

export function useWaitForNodesToValidate() {
  const registry = GeneratorInternal.useRegistry();
  const formStore = FormStore.raw.useStore();
  const lookups = FormBootstrap.useLayoutLookups();

  return useCallback(async (): Promise<void> => {
    let callbackId: ReturnType<typeof requestIdleCallback | typeof requestAnimationFrame> | undefined;
    const request = window.requestIdleCallback || window.requestAnimationFrame;
    const cancel = window.cancelIdleCallback || window.cancelAnimationFrame;

    function check(): boolean {
      const state = formStore.getState();
      const processedLast = state.validation.processedLast;
      const allNodeData = state.nodes.nodeData;
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
  }, [lookups, formStore, registry]);
}

function doesNodeSupportValidation<T extends CompTypes>(nodeData: NodeData, layout: CompExternal<T>): boolean {
  return nodeData && 'validations' in nodeData && shouldValidateNode(layout);
}
