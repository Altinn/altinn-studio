import React, { useRef, useState } from 'react';

import { createContext } from 'src/core/contexts/context';
import type { LangDataSources } from 'src/features/language/LangDataSourcesProvider';
import type { IUseLanguage } from 'src/features/language/useLanguage';

interface Context {
  latestRef: React.MutableRefObject<IUseLanguage | undefined>;
  dataSources: LangDataSources | undefined;
  setDataSources: React.Dispatch<React.SetStateAction<LangDataSources | undefined>>;
}

const { Provider, useCtx } = createContext<Context>({
  name: 'LangToolsStore',
  required: true,
});

export function LangToolsStoreProvider({ children }: React.PropsWithChildren) {
  const [dataSources, setDataSources] = useState<LangDataSources | undefined>(undefined);
  const latestRef = useRef<IUseLanguage>();

  return (
    <Provider
      value={{
        latestRef,
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

/**
 * This provides a ref to the result of useLanguage(). It does not have any node locality (so it will not work
 * inside repeating groups, when looking up variables relative to the row index), but it can be used
 * for purposes where it's important not to re-render often (e.g. when creating the node hierarchy), and where
 * rendering language keys is not needed immediately, but in e.g. a callback function.
 *
 * It is set via ProvideUseLanguageRef, which is rendered as soon as possible in the <RenderStart> component.
 */
export const useLangToolsRef = () => useCtx().latestRef as React.MutableRefObject<IUseLanguage>;
