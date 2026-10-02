import { useCallback } from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { getDerivedNodeDescendantIds } from 'src/utils/layout/derivedNodeTraversal';
import { deriveRuntimeNodeRefs } from 'src/utils/layout/deriveRuntimeNodeRefs';
import { applyRowContextToComponentId, getIndexedDataModelReference } from 'src/utils/layout/rowContext';
import type { LookupFailure } from 'src/core/queries/lookup';
import type { FormStoreSet, FormStoreState } from 'src/features/form/FormContext';

export type LookupInput =
  | { type: 'PersonLookup'; ssn: string; lastName: string; failure?: LookupFailure }
  | { type: 'OrganizationLookup'; orgNr: string; failure?: LookupFailure };

export interface LookupSliceState {
  inputs: Record<string, LookupInput | undefined>;
  setLookupInput: (indexedId: string, input: LookupInput) => void;
  clearLookupInput: (indexedId: string) => void;
  reindexLookupInputsForRowDeletion: (indexedGroupId: string, rowIndex: number) => void;
}

/** Search inputs are temporary and must not overwrite the data model's lookup result. */
export function createLookupSlice(set: FormStoreSet): FormStoreState['lookup'] {
  return {
    inputs: {},
    setLookupInput: (indexedId, input) =>
      set((state) => {
        state.lookup.inputs[indexedId] = input;
      }),
    clearLookupInput: (indexedId) =>
      set((state) => {
        delete state.lookup.inputs[indexedId];
      }),
    reindexLookupInputsForRowDeletion: (indexedGroupId, rowIndex) =>
      set((state) => {
        if (!Object.keys(state.lookup.inputs).length && !Object.keys(state.validation.componentMasks).length) {
          return;
        }
        const nodes = deriveRuntimeNodeRefs(state);
        const group = nodes.find((node) => node.id === indexedGroupId);
        if (!group) {
          return;
        }
        const component = state.bootstrap.layoutLookups.getComponent(group.baseId);
        if (component.type !== 'RepeatingGroup') {
          return;
        }
        const groupBinding = getIndexedDataModelReference(component.dataModelBindings.group, group.rowContexts);
        const depth = group.rowContexts.length;
        const descendants = new Set(getDerivedNodeDescendantIds(nodes, indexedGroupId));
        const affected = nodes
          .filter((node) => {
            const context = node.rowContexts[depth];
            return (
              descendants.has(node.id) &&
              context &&
              context.groupBinding.dataType === groupBinding.dataType &&
              context.groupBinding.field === groupBinding.field &&
              context.rowIndex >= rowIndex
            );
          })
          .map((node) => ({
            node,
            input: state.lookup.inputs[node.id],
            mask: state.validation.componentMasks[node.id],
          }));

        // Clear old indexes before moving later rows, including children of nested groups.
        for (const { node } of affected) {
          delete state.lookup.inputs[node.id];
          delete state.validation.componentMasks[node.id];
        }
        for (const { node, input, mask } of affected) {
          if (node.rowContexts[depth].rowIndex === rowIndex) {
            continue;
          }
          const rowContexts = node.rowContexts.map((context, index) =>
            index === depth ? { ...context, rowIndex: context.rowIndex - 1 } : context,
          );
          const indexedId = applyRowContextToComponentId(node.baseId, rowContexts);
          if (input) {
            state.lookup.inputs[indexedId] = input;
          }
          if (mask !== undefined) {
            state.validation.componentMasks[indexedId] = mask;
          }
        }
      }),
  };
}

export function useLookupInput(indexedId: string) {
  const input = FormStore.raw.useSelector((state) => state.lookup.inputs[indexedId]);
  const setInput = FormStore.raw.useStaticSelector((state) => state.lookup.setLookupInput);
  const clearInput = FormStore.raw.useStaticSelector((state) => state.lookup.clearLookupInput);
  const clear = useCallback(() => clearInput(indexedId), [clearInput, indexedId]);

  return {
    input,
    setInput: useCallback((input: LookupInput) => setInput(indexedId, input), [indexedId, setInput]),
    clearInput: clear,
  };
}
