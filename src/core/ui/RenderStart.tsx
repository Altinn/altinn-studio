import React from 'react';
import type { PropsWithChildren } from 'react';

import { DevTools } from 'src/features/devtools/DevTools';
import { DataModelFetcher } from 'src/features/formData/FormDataReaders';
import { LangDataSourcesProvider } from 'src/features/language/LangDataSourcesProvider';

interface Props extends PropsWithChildren {
  devTools?: boolean;
  dataModelFetcher?: boolean;
}

/**
 * This component is used to wrap the entire application, and should always be the first component to wrap components
 * that start rendering content inside providers. It will make sure certain things are always loaded and visible
 * in the application, such as the dev tools.
 */
export function RenderStart({ children, devTools = true, dataModelFetcher = true }: Props) {
  return (
    <LangDataSourcesProvider>
      {children}
      {devTools && <DevTools />}
      {dataModelFetcher && <DataModelFetcher />}
    </LangDataSourcesProvider>
  );
}
