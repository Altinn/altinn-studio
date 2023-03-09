import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';

import { createTheme, MuiThemeProvider } from '@material-ui/core';
import { render as rtlRender } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import type { PreloadedState } from 'redux';

import { setupStore } from 'src/store';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { ExprContextWrapper } from 'src/utils/layout/ExprContext';
import type { IComponentProps } from 'src/layout';
import type { AppStore, RootState } from 'src/store';

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: PreloadedState<RootState>;
  store?: AppStore;
}

export const renderWithProviders = (
  component: any,
  { preloadedState = {}, store = setupStore(preloadedState), ...renderOptions }: ExtendedRenderOptions = {},
) => {
  function Wrapper({ children }: React.PropsWithChildren) {
    const theme = createTheme(AltinnAppTheme);

    return (
      <MuiThemeProvider theme={theme}>
        <Provider store={store}>
          <ExprContextWrapper>{children}</ExprContextWrapper>
        </Provider>
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

export const mockMediaQuery = (maxWidth: number) => {
  const setScreenWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    window.matchMedia = jest.fn().mockImplementation((query: string) => {
      return {
        matches: width <= maxWidth,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      };
    });
  };

  return { setScreenWidth };
};

interface MemoryRouterWithRedirectingRootParams {
  initialEntries?: string[];
  basename?: string;
  element?: JSX.Element | JSX.Element[] | null;
  to: string;
  children: JSX.Element | JSX.Element[] | null;
}

export function MemoryRouterWithRedirectingRoot({
  initialEntries = [''],
  basename = '/ttd/test',
  element = null,
  to,
  children,
}: MemoryRouterWithRedirectingRootParams) {
  const Relocate = ({ navPath }) => {
    return (
      <Navigate
        to={navPath}
        replace
      />
    );
  };
  return (
    <MemoryRouter
      initialEntries={initialEntries.map((e) => `${basename}${e}`)}
      basename={basename}
    >
      {element}
      <Routes>
        <Route
          path={'/'}
          element={<Relocate navPath={to} />}
        />
        {children}
      </Routes>
    </MemoryRouter>
  );
}

export const mockComponentProps: IComponentProps & { id: string } = {
  id: 'component-id',
  formData: {},
  handleDataChange: () => {
    throw new Error('Called mock handleDataChange, override this yourself');
  },
  getTextResource: () => {
    throw new Error('Called mock getTextResource, override this yourself');
  },
  getTextResourceAsString: () => {
    throw new Error('Called mock getTextResourceAsString, override this yourself');
  },
  shouldFocus: false,
  isValid: undefined,
  language: {},
  componentValidations: {},
  label: () => {
    throw new Error('Rendered mock label, override this yourself');
  },
  legend: () => {
    throw new Error('Rendered mock legend, override this yourself');
  },
  text: undefined,
};
