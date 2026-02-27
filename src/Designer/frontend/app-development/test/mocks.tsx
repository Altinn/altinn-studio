import type { ReactNode } from 'react';
import React from 'react';
import { render, renderHook } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { FeatureFlag } from '@studio/feature-flags';

import type { QueryClient } from '@tanstack/react-query';
import { PreviewContext, type PreviewContextProps } from '../contexts/PreviewContext';
import { composeWrappers, type WrapperFunction } from '@studio/testing/composeWrappers';
import {
  withServicesProvider,
  withPreviewConnection,
  withTestAppRouter,
  withFeatureFlags,
} from '@studio/testing/providerWrappers';

const defaultPreviewContextProps: PreviewContextProps = {
  shouldReloadPreview: false,
  doReloadPreview: jest.fn(),
  previewHasLoaded: jest.fn(),
};

function withPreviewContext(
  previewContextProps: Partial<PreviewContextProps> = {},
): WrapperFunction {
  return (children: ReactNode) => (
    <PreviewContext.Provider value={{ ...defaultPreviewContextProps, ...previewContextProps }}>
      {children}
    </PreviewContext.Provider>
  );
}

export const renderWithProviders =
  (
    queries: Partial<ServicesContextProps> = {},
    queryClient?: QueryClient,
    previewContextProps: Partial<PreviewContextProps> = {},
    path?: string,
    pathTemplate?: string,
    featureFlagsList: FeatureFlag[] = [],
  ) =>
  (component: ReactNode) => {
    const Wrapper = composeWrappers([
      withFeatureFlags({ featureFlags: featureFlagsList }),
      withTestAppRouter({ initialPath: path, pathTemplate }),
      withServicesProvider({ queries, queryClient }),
      withPreviewConnection(),
      withPreviewContext(previewContextProps),
    ]);

    const renderResult = render(<Wrapper>{component}</Wrapper>);
    const rerender = (rerenderedComponent: ReactNode) =>
      renderResult.rerender(<Wrapper>{rerenderedComponent}</Wrapper>);
    return { renderResult: { ...renderResult, rerender } };
  };

export const renderHookWithProviders =
  (
    queries: Partial<ServicesContextProps> = {},
    queryClient?: QueryClient,
    featureFlagsList: FeatureFlag[] = [],
  ) =>
  (hook: () => any) => {
    const Wrapper = composeWrappers([
      withFeatureFlags({ featureFlags: featureFlagsList }),
      withTestAppRouter(),
      withServicesProvider({ queries, queryClient }),
      withPreviewConnection(),
    ]);

    const renderHookResult = renderHook(hook, { wrapper: Wrapper });
    return { renderHookResult };
  };
