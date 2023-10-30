import React from 'react';
import { Provider } from 'react-redux';

import { createTheme, MuiThemeProvider } from '@material-ui/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render as rtlRender } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import type { JSONSchema7 } from 'json-schema';
import type { PreloadedState } from 'redux';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { AppQueriesContextProvider } from 'src/contexts/appQueriesContext';
import { AllOptionsProvider } from 'src/features/options/useAllOptions';
import { setupStore } from 'src/redux/store';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { ExprContextWrapper, useResolvedNode } from 'src/utils/layout/ExprContext';
import type { AppQueriesContext } from 'src/contexts/appQueriesContext';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { IDataList } from 'src/features/dataLists';
import type { IFooterLayout } from 'src/features/footer/types';
import type { IComponentProps, PropsFromGenericComponent } from 'src/layout';
import type { CompExternalExact, CompTypes } from 'src/layout/layout';
import type { AppStore, RootState } from 'src/redux/store';
import type { ILayoutSets, IRuntimeState } from 'src/types';
import type { IProfile } from 'src/types/shared';

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

    const allMockedQueries = {
      doPartyValidation: () => Promise.resolve({ valid: true, validParties: [], message: null }),
      doSelectParty: () => Promise.resolve(null),
      fetchActiveInstances: () => Promise.resolve([]),
      fetchApplicationMetadata: () => Promise.resolve({} as unknown as IApplicationMetadata),
      fetchCurrentParty: () => Promise.resolve({}),
      fetchApplicationSettings: () => Promise.resolve({}),
      fetchFooterLayout: () => Promise.resolve({ footer: [] } as IFooterLayout),
      fetchLayoutSets: () => Promise.resolve({} as unknown as ILayoutSets),
      fetchOrgs: () => Promise.resolve({ orgs: {} }),
      fetchUserProfile: () => Promise.resolve({} as unknown as IProfile),
      fetchDataModelSchema: () => Promise.resolve({}),
      fetchParties: () => Promise.resolve({}),
      fetchRefreshJwtToken: () => Promise.resolve({}),
      fetchCustomValidationConfig: () => Promise.resolve(null),
      fetchFormData: () => Promise.resolve({}),
      fetchOptions: () => Promise.resolve([]),
      fetchDataList: () => Promise.resolve({} as unknown as IDataList),
      fetchPdfFormat: () => Promise.resolve({ excludedPages: [], excludedComponents: [] }),
      fetchDynamics: () => Promise.resolve(null),
      fetchRuleHandler: () => Promise.resolve(null),
      fetchTextResources: () => Promise.resolve({ language: 'nb', resources: [] }),
      fetchLayoutSchema: () => Promise.resolve({} as JSONSchema7),
    } as AppQueriesContext;
    const mockedQueries = { ...allMockedQueries, ...queries };

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
              <ExprContextWrapper>
                <AllOptionsProvider>{children}</AllOptionsProvider>
              </ExprContextWrapper>
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

export interface RenderGenericComponentTestProps<T extends CompTypes> {
  type: T;
  renderer: (props: PropsFromGenericComponent<T>) => JSX.Element;
  component?: Partial<CompExternalExact<T>>;
  genericProps?: Partial<PropsFromGenericComponent<T>>;
  manipulateState?: (state: IRuntimeState) => void;
  manipulateStore?: (store: ReturnType<typeof setupStore>['store']) => void;
  mockedQueries?: Partial<AppQueriesContext>;
}

export function renderGenericComponentTest<T extends CompTypes>({
  type,
  renderer,
  component,
  genericProps,
  manipulateState,
  manipulateStore,
  mockedQueries,
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
    ...renderWithProviders(<Wrapper />, { store }, mockedQueries),
  };
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
