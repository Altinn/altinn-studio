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

export function DataModelLocationProviderFromNode({ nodeId, children }: PropsWithChildren<{ nodeId: string }>) {
  const { groupBinding, rowIndex } = NodesInternal.useMemoSelector((state) => {
    let childId = nodeId;
    let parentId = state.nodeData[childId]?.parentId;
    while (parentId) {
      const child = state.nodeData[childId];
      const parent = state.nodeData[parentId];
      const groupBinding =
        parent.layout.type === 'RepeatingGroup'
          ? parent.layout.dataModelBindings.group
          : parent.layout.type === 'Likert'
            ? parent.layout.dataModelBindings.questions
            : undefined;
      if (groupBinding && child?.rowIndex !== undefined) {
        return { groupBinding, rowIndex: child.rowIndex };
      }

      childId = parentId;
      parentId = state.nodeData[childId]?.parentId;
    }

    return { groupBinding: undefined, rowIndex: undefined };
  });

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

export function useDataModelLocationForRow(groupBinding: IDataModelReference, rowIndex: number) {
  return useMemo(
    () => ({
      dataType: groupBinding.dataType,
      field: `${groupBinding.field}[${rowIndex}]`,
    }),
    [groupBinding.dataType, groupBinding.field, rowIndex],
  );
}

export function useComponentIdMutator(): IdMutator {
  const mutators = useCtx()?.idMutators;
  return useCallback(
    (id) => {
      let newId = id;
      for (const mutator of mutators ?? []) {
        newId = mutator(newId);
      }

      return newId;
    },
    [mutators],
  );
}
