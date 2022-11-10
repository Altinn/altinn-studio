import React from 'react';
import type { RenderOptions } from '@testing-library/react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { PreloadedState } from '@reduxjs/toolkit';
import { Router } from 'react-router-dom';
import type { AppStore, RootState } from '../store';
import { setupStore } from '../store';
import { createMemoryHistory } from 'history';
import { APP_DEVELOPMENT_BASENAME } from '../../constants';

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: PreloadedState<RootState>;
  store?: AppStore;
  startUrl?: string;
}

export const renderWithProviders = (
  component: any,
  {
    preloadedState = {},
    store = setupStore(preloadedState),
    startUrl = undefined,
    ...renderOptions
  }: ExtendedRenderOptions = {},
) => {
  function Wrapper({ children }: React.PropsWithChildren<unknown>) {
    const history = createMemoryHistory();
    history.push(startUrl);
    return (
      <Provider store={store}>
        <Router
          basename={APP_DEVELOPMENT_BASENAME}
          location={history.location}
          navigator={history}
        >
          {children}
        </Router>
      </Provider>
    );
  }

  return {
    store,
    ...render(component, {
      wrapper: Wrapper,
      ...renderOptions,
    }),
  };
};
