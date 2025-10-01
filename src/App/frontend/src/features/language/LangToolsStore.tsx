import React from 'react';

import { createContext } from 'src/core/contexts/context';
import { useStateDeepEqual } from 'src/hooks/useStateDeepEqual';
import type { LangDataSources } from 'src/features/language/LangDataSourcesProvider';

interface Context {
  dataSources: LangDataSources | undefined;
  setDataSources: React.Dispatch<React.SetStateAction<LangDataSources | undefined>>;
}

const { Provider, useCtx } = createContext<Context>({
  name: 'LangToolsStore',
  required: true,
});

export function LangToolsStoreProvider({ children }: React.PropsWithChildren) {
  const [dataSources, setDataSources] = useStateDeepEqual<LangDataSources | undefined>(undefined);

  return (
    <Provider
      value={{
        dataSources,
        setDataSources,
      }}
    >
      {children}
    </Provider>
  );
}

export const useLangToolsDataSources = () => useCtx().dataSources;
export const useSetLangToolsDataSources = () => useCtx().setDataSources;
