import React from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';

import { createTheme, MuiThemeProvider } from '@material-ui/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import type { PreloadedState } from 'redux';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { AppQueriesContextProvider } from 'src/contexts/appQueriesContext';
import { DataModelSchemaContextWrapper } from 'src/hooks/useDataModelSchema';
import { setupStore } from 'src/redux/store';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { ExprContextWrapper, useResolvedNode } from 'src/utils/layout/ExprContext';
import type { AppQueriesContext } from 'src/contexts/appQueriesContext';
import type { IComponentProps, PropsFromGenericComponent } from 'src/layout';
import type { ComponentTypes } from 'src/layout/layout';
import type { AppStore, RootState } from 'src/redux/store';
import type { IRuntimeState } from 'src/types';
import type { AnyItem } from 'src/utils/layout/hierarchy.types';

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: PreloadedState<RootState>;
  store?: AppStore;
}

export const renderWithProviders = (
  component: any,
  { preloadedState = {}, store = setupStore(preloadedState).store, ...renderOptions }: ExtendedRenderOptions = {},
  queries?: Partial<AppQueriesContext>,
) => {
  function Wrapper({ children }: React.PropsWithChildren) {
    const theme = createTheme(AltinnAppTheme);

    const mockedQueries = {
      doPartyValidation: () => Promise.resolve({ data: { isValid: true, validParties: [] } }),
      fetchActiveInstances: () => Promise.resolve([]),
      fetchApplicationMetadata: () => Promise.resolve({}),
      fetchCurrentParty: () => Promise.resolve({}),
      fetchApplicationSettings: () => Promise.resolve({}),
      fetchFooterLayout: () => Promise.resolve({}),
      fetchLayoutSets: () => Promise.resolve([]),
      fetchOrgs: () => Promise.resolve({}),
      fetchUserProfile: () => Promise.resolve({}),
      ...queries,
    } as AppQueriesContext;

    const client = new QueryClient({
      logger: {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        log: () => {},
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        warn: () => {},
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        error: () => {},
      },
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false, staleTime: Infinity },
      },
    });
    return (
      <QueryClientProvider client={client}>
        <AppQueriesContextProvider {...mockedQueries}>
          <MuiThemeProvider theme={theme}>
            <Provider store={store}>
              <DataModelSchemaContextWrapper>
                <ExprContextWrapper>{children}</ExprContextWrapper>
              </DataModelSchemaContextWrapper>
            </Provider>
          </MuiThemeProvider>
        </AppQueriesContextProvider>
      </QueryClientProvider>
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

export interface RenderGenericComponentTestProps<T extends ComponentTypes> {
  type: T;
  renderer: (props: PropsFromGenericComponent<T>) => JSX.Element;
  component?: Partial<AnyItem<T>>;
  genericProps?: Partial<PropsFromGenericComponent<T>>;
  manipulateState?: (state: IRuntimeState) => void;
  manipulateStore?: (store: ReturnType<typeof setupStore>['store']) => void;
}

export function renderGenericComponentTest<T extends ComponentTypes>({
  type,
  renderer,
  component,
  genericProps,
  manipulateState,
  manipulateStore,
}: RenderGenericComponentTestProps<T>) {
  const realComponentDef = {
    id: 'my-test-component-id',
    type,
    ...component,
  } as any;

  const Wrapper = () => {
    const node = useResolvedNode(realComponentDef.id) as any;
    const props: PropsFromGenericComponent<T> = {
      node,
      ...mockComponentProps,
      ...genericProps,
    };

    return renderer(props);
  };

  const preloadedState = getInitialStateMock();
  manipulateState && manipulateState(preloadedState);
  preloadedState.formLayout.layouts?.FormLayout?.push(realComponentDef);

  const { store } = setupStore(preloadedState);
  manipulateStore && manipulateStore(store);

  return {
    ...renderWithProviders(<Wrapper />, { store }),
  };
}

export const mockMediaQuery = (maxWidth: number) => {
  const setScreenWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: width <= maxWidth,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }));
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
  const Relocate = ({ navPath }) => (
    <Navigate
      to={navPath}
      replace
    />
  );
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
  shouldFocus: false,
  isValid: undefined,
  componentValidations: {},
  label: () => {
    throw new Error('Rendered mock label, override this yourself');
  },
  legend: () => {
    throw new Error('Rendered mock legend, override this yourself');
  },
};

export const createStorageMock = (): Storage => {
  let storage: Record<string, string> = {};
  return {
    setItem: (key, value) => {
      storage[key] = value || '';
    },
    getItem: (key) => (key in storage ? storage[key] : null),
    clear: () => {
      storage = {};
    },
    removeItem: (key) => {
      delete storage[key];
    },
    get length() {
      return Object.keys(storage).length;
    },
    key: (i) => {
      const keys = Object.keys(storage);
      return keys[i] || null;
    },
  };
};
