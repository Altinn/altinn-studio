import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { useIsLoading } from 'src/core/loading/LoadingContext';
import { DevTools } from 'src/features/devtools/DevTools';
import { DataModelFetcher } from 'src/features/formData/FormDataReaders';
import { LangDataSourcesProvider } from 'src/features/language/LangDataSourcesProvider';
import { useNavigationEffect, useNavigationParam } from 'src/features/routing/AppRoutingContext';

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
      <RunNavigationEffect />
      {children}
      {devTools && <DevTools />}
      {dataModelFetcher && <DataModelFetcher />}
    </LangDataSourcesProvider>
  );
}

function RunNavigationEffect() {
  const isLoading = useIsLoading();
  const pageKey = useNavigationParam('pageKey');
  const navigationEffect = useNavigationEffect();

  useEffect(() => {
    if (!isLoading && navigationEffect) {
      navigationEffect();
    }
  }, [isLoading, navigationEffect, pageKey]);

  return null;
}
