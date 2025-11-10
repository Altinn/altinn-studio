import React from 'react';
import type { PropsWithChildren } from 'react';

import { BlockPrint } from 'src/components/ReadyForPrint';
import { createContext } from 'src/core/contexts/context';

interface Context {
  reason: string;
}

const { Provider, useCtx } = createContext<Context | undefined>({
  name: 'Loading',
  required: false,
  default: undefined,
});

export function LoadingProvider({ children, ...rest }: PropsWithChildren<Context>) {
  return (
    <>
      <BlockPrint />
      <Provider value={rest}>{children}</Provider>
    </>
  );
}

export const useIsLoading = () => useCtx() !== undefined;
