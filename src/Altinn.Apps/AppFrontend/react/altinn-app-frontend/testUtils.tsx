import React from 'react';
import { createTheme, MuiThemeProvider } from '@material-ui/core';
import { Provider } from 'react-redux';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { render as rtlRender } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import type { PreloadedState } from '@reduxjs/toolkit';

import { RootState, AppStore, setupStore } from 'src/store';
import { AltinnAppTheme } from 'altinn-shared/theme';

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
    const theme = createTheme(AltinnAppTheme);

    return (
      <MuiThemeProvider theme={theme}>
        <Provider store={store}>{children}</Provider>
      </MuiThemeProvider>
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
  rest.get(
    'https://api.bring.com/shippingguide/api/postalCode.json',
    (req, res, ctx) => {
      const mockApiResponse = {
        valid: true,
        result: 'OSLO',
      };
      return res(ctx.json(mockApiResponse));
    },
  ),
];

export { setupServer, rest };
