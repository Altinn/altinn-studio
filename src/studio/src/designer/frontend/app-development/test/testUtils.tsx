import React from 'react';
import type { ComponentType } from 'react';
import { render as rtlRender } from '@testing-library/react';
import { Provider } from 'react-redux';
import type { RenderOptions } from '@testing-library/react';
import type { PreloadedState } from '@reduxjs/toolkit';
import { HashRouter as Router } from 'react-router-dom';
import { setupStore } from '../store';
import type { AppStore, RootState } from '../store';

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
  }: ExtendedRenderOptions = {},
) => {
  function Wrapper({ children }: React.PropsWithChildren<unknown>) {
    return (
      <Provider store={store}>
        <Router>{children}</Router>
      </Provider>
    );
  }

  return {
    store,
    ...rtlRender(component, {
      wrapper: Wrapper as ComponentType,
      ...renderOptions,
    }),
  };
};
