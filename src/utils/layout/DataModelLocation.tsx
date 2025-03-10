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
  binding,
  rowIndex,
  children,
}: PropsWithChildren<{
  binding: IDataModelReference;
  rowIndex: number;
}>) {
  const value = useMemo(
    () => ({
      ...binding,
      field: `${binding.field}[${rowIndex}]`,
    }),
    [binding, rowIndex],
  );

  return <Provider value={value}>{children}</Provider>;
}
