import React, { useCallback, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { IDataModelReference } from 'src/layout/common.generated';

export type IdMutator = (id: string) => string;

interface DMLocation {
  reference: IDataModelReference;
  idMutators: IdMutator[];
}

const { Provider, useCtx } = createContext<DMLocation | undefined>({
  name: 'DataModelLocation',
  default: undefined,
  required: false,
});

export const useCurrentDataModelLocation = () => useCtx()?.reference;

export function DataModelLocationProvider({
  groupBinding,
  rowIndex,
  children,
}: PropsWithChildren<{
  groupBinding: IDataModelReference;
  rowIndex: number;
}>) {
  const parentCtx = useCtx();
  const value = useMemo(
    () => ({
      reference: {
        dataType: groupBinding.dataType,
        field: `${groupBinding.field}[${rowIndex}]`,
      },
      idMutators: [...(parentCtx?.idMutators ?? []), (id: string) => `${id}-${rowIndex}`],
    }),
    [parentCtx?.idMutators, rowIndex, groupBinding.dataType, groupBinding.field],
  );
  return <Provider value={value}>{children}</Provider>;
}

function useDataModelLocationForNodeRaw(nodeId: string | undefined) {
  return NodesInternal.useMemoSelector((state) => {
    if (!nodeId) {
      return { groupBinding: undefined, rowIndex: undefined };
    }

    let childId = nodeId;
    let parentId = state.nodeData[childId]?.parentId;
    while (parentId) {
      const child = state.nodeData[childId];
      const parent = state.nodeData[parentId];
      const groupBinding =
        parent.nodeType === 'RepeatingGroup'
          ? parent.dataModelBindings.group
          : parent.nodeType === 'Likert'
            ? parent.dataModelBindings.questions
            : undefined;
      if (groupBinding && child?.rowIndex !== undefined) {
        return { groupBinding, rowIndex: child.rowIndex };
      }

      childId = parentId;
      parentId = state.nodeData[childId]?.parentId;
    }

    return { groupBinding: undefined, rowIndex: undefined };
  });
}

export function useDataModelLocationForNode(nodeId: string | undefined): IDataModelReference | undefined {
  const { groupBinding, rowIndex } = useDataModelLocationForNodeRaw(nodeId);
  return useDataModelLocationForRow(groupBinding, rowIndex);
}

export function DataModelLocationProviderFromNode({ nodeId, children }: PropsWithChildren<{ nodeId: string }>) {
  const { groupBinding, rowIndex } = useDataModelLocationForNodeRaw(nodeId);

  if (!groupBinding) {
    return children;
  }

  return (
    <DataModelLocationProvider
      groupBinding={groupBinding}
      rowIndex={rowIndex}
    >
      {children}
    </DataModelLocationProvider>
  );
}

export function useDataModelLocationForRow(
  groupBinding: IDataModelReference | undefined,
  rowIndex: number | undefined,
) {
  const { dataType, field } = groupBinding ?? {};
  return useMemo(
    () => (dataType && field && rowIndex !== undefined ? { dataType, field: `${field}[${rowIndex}]` } : undefined),
    [dataType, field, rowIndex],
  );
}

export function useComponentIdMutator(skipLastMutator = false): IdMutator {
  const mutators = useCtx()?.idMutators;
  return useCallback(
    (id) => {
      let newId = id;
      for (const [index, mutator] of mutators?.entries() ?? []) {
        if (skipLastMutator && mutators && index === mutators.length - 1) {
          continue;
        }
        newId = mutator(newId);
      }

      return newId;
    },
    [mutators, skipLastMutator],
  );
}

/**
 * This will give you a properly indexed ID, given a base component ID. I.e. 'currentValue' will give
 * you 'currentValue-0' when we're in the first row inside a repeating group.
 *
 * @see useIndexedComponentIds - An alternative (more complex) solution that will complain if the target ID does not
 * belong here, according to the layout structure.
 */
export function useIndexedId(baseId: string, skipLastMutator?: boolean): string;
// eslint-disable-next-line no-redeclare
export function useIndexedId(baseId: string | undefined, skipLastMutator?: boolean): string | undefined;
// eslint-disable-next-line no-redeclare
export function useIndexedId(baseId: unknown, skipLastMutator = false) {
  const idMutator = useComponentIdMutator(skipLastMutator);
  return useMemo(() => (typeof baseId === 'string' ? idMutator(baseId) : baseId), [baseId, idMutator]);
}
