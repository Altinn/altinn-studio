import React, { useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { createContext } from 'src/core/contexts/context';
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

export function useDataModelLocationForRow(groupBinding: IDataModelReference, rowIndex: number) {
  return useMemo(
    () => ({
      ...groupBinding,
      field: `${groupBinding.field}[${rowIndex}]`,
    }),
    [groupBinding, rowIndex],
  );
}
