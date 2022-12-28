import type { PropsWithChildren } from 'react';
import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { RenderOptions } from '@testing-library/react';
import type { PreloadedState } from '@reduxjs/toolkit';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { HashRouter as Router } from 'react-router-dom';
import type { AppStore, RootState } from './app/store';
import { setupStore } from './app/store';
import { orgsListPath, repoSearchPath, userStarredListPath } from 'app-shared/api-paths';

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: PreloadedState<RootState>;
  store?: AppStore;
}

export const renderWithProviders = (
  component: any,
  {
    preloadedState = {},
    store = setupStore(preloadedState),
    ...renderOptions
  }: ExtendedRenderOptions = {}
) => {
  function Wrapper({ children }: PropsWithChildren<unknown>) {
    return (
      <Provider store={store}>
        <Router>{children}</Router>
      </Provider>
    );
  }

  return {
    store,
    ...rtlRender(component, {
      wrapper: Wrapper,
      ...renderOptions,
    }),
  };
};

export const handlers = [
  rest.get(orgsListPath(), (req, res, ctx) => {
    const mockApiResponse = [
      {
        avatar_url: 'avatar.png',
        description: '',
        full_name: 'test-org',
        id: 1,
        location: '',
        username: 'org-username',
        website: '',
      },
    ];
    return res(ctx.json(mockApiResponse));
  }),
  rest.get(userStarredListPath(), (req, res, ctx) => {
    const mockApiResponse: any = [];
    return res(ctx.json(mockApiResponse));
  }),
  rest.get(repoSearchPath(), (req, res, ctx) => {
    const mockApiResponse: any = [];
    return res(ctx.json(mockApiResponse));
  }),
];

export { setupServer, rest };
