import React, { useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { IDataModelReference } from 'src/layout/common.generated';

const { Provider, useCtx } = createContext<IDataModelReference | undefined>({
  name: 'DataModelLocation',
  default: undefined,
  required: false,
});

export const useCurrentDataModelLocation = () => useCtx();

export function DataModelLocationProvider({
  groupBinding,
  rowIndex,
  children,
}: PropsWithChildren<{
  groupBinding: IDataModelReference;
  rowIndex: number;
}>) {
  return <Provider value={useDataModelLocationForRow(groupBinding, rowIndex)}>{children}</Provider>;
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
      ...groupBinding,
      field: `${groupBinding.field}[${rowIndex}]`,
    }),
    [groupBinding, rowIndex],
  );
}
