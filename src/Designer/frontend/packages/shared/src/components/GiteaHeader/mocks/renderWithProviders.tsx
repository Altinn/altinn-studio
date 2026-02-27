import type { ReactNode } from 'react';
import React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import { GiteaHeaderContext, type GiteaHeaderContextProps } from '../context/GiteaHeaderContext';
import { app, org } from '@studio/testing/testids';
import { composeWrappers, type WrapperFunction } from '@studio/testing/composeWrappers';
import { withServicesProvider, withBrowserRouter } from '@studio/testing/providerWrappers';

const defaultGiteaHeaderContextProps: GiteaHeaderContextProps = {
  owner: org,
  repoName: app,
};

function withGiteaHeaderContext(
  giteaContextProps: Partial<GiteaHeaderContextProps> = {},
): WrapperFunction {
  return (children: ReactNode) => (
    <GiteaHeaderContext.Provider
      value={{ ...defaultGiteaHeaderContextProps, ...giteaContextProps }}
    >
      {children}
    </GiteaHeaderContext.Provider>
  );
}

export const renderWithProviders =
  (
    queries: Partial<ServicesContextProps> = {},
    queryClient?: QueryClient,
    giteaContextProps: Partial<GiteaHeaderContextProps> = {},
  ) =>
  (component: ReactNode): RenderResult => {
    const Wrapper = composeWrappers([
      withServicesProvider({ queries, queryClient }),
      withGiteaHeaderContext(giteaContextProps),
      withBrowserRouter(),
    ]);

    return render(<Wrapper>{component}</Wrapper>);
  };
