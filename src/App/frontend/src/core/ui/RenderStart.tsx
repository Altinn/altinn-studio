import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { PropsWithChildren } from 'react';

import { loadingClassName, useHasElementsByClass } from 'src/components/ReadyForPrint';
import { useIsLoading } from 'src/core/loading/LoadingContext';
import { DevTools } from 'src/features/devtools/DevTools';
import { DataModelFetcher } from 'src/features/formData/FormDataReaders';
import { LangDataSourcesProvider } from 'src/features/language/LangDataSourcesProvider';
import { useNavigationEffect } from 'src/features/navigation/NavigationEffectContext';

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
  const hasLoaders = useHasElementsByClass(loadingClassName);
  const navigationEffect = useNavigationEffect();
  const location = useLocation().pathname;

  const targetLocation = navigationEffect?.targetLocation?.split('?')[0];
  const shouldRun =
    !isLoading &&
    !hasLoaders &&
    targetLocation &&
    (location === targetLocation || (navigationEffect?.matchStart && location.startsWith(targetLocation)));

  useEffect(() => {
    if (shouldRun && navigationEffect) {
      navigationEffect.callback();
    }
  }, [navigationEffect, shouldRun]);

  return null;
}
