import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { PropsWithChildren } from 'react';

import { createTheme, MuiThemeProvider } from '@material-ui/core';
import { QueryClient } from '@tanstack/react-query';
import { act, render as rtlRender, waitFor } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import type { AxiosResponse } from 'axios';
import type { JSONSchema7 } from 'json-schema';

import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getLayoutSetsMock } from 'src/__mocks__/getLayoutSetsMock';
import { getOrgsMock } from 'src/__mocks__/getOrgsMock';
import { getPartyMock } from 'src/__mocks__/getPartyMock';
import { getProcessDataMock } from 'src/__mocks__/getProcessDataMock';
import { getProfileMock } from 'src/__mocks__/getProfileMock';
import { getTextResourcesMock } from 'src/__mocks__/getTextResourcesMock';
import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { AppQueriesProvider } from 'src/core/contexts/AppQueriesProvider';
import { ApplicationMetadataProvider } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { ApplicationSettingsProvider } from 'src/features/applicationSettings/ApplicationSettingsProvider';
import { FooterLayoutProvider } from 'src/features/footer/FooterLayoutProvider';
import { generateSimpleRepeatingGroups } from 'src/features/form/layout/repGroups/generateSimpleRepeatingGroups';
import { LayoutSetsProvider } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import { InstantiationProvider } from 'src/features/instantiate/InstantiationContext';
import { LanguageProvider } from 'src/features/language/LanguageProvider';
import { TextResourcesProvider } from 'src/features/language/textResources/TextResourcesProvider';
import { OrgsProvider } from 'src/features/orgs/OrgsProvider';
import { PartyProvider } from 'src/features/party/PartiesProvider';
import { ProfileProvider } from 'src/features/profile/ProfileProvider';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { setupStore } from 'src/redux/store';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { ExprContextWrapper, useExprContext } from 'src/utils/layout/ExprContext';
import type { AppMutations, AppQueries, AppQueriesContext } from 'src/core/contexts/AppQueriesProvider';
import type { IDataList } from 'src/features/dataLists';
import type { IFooterLayout } from 'src/features/footer/types';
import type { IComponentProps, PropsFromGenericComponent } from 'src/layout';
import type { IOption } from 'src/layout/common.generated';
import type { CompExternalExact, CompTypes, ILayoutCollection, ILayouts } from 'src/layout/layout';
import type { IRuntimeState } from 'src/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';

/**
 * These are the queries that cannot be mocked. Instead of mocking the queries themselves, you should provide preloaded
 * state that contains the state you need. In the future when we get rid of redux, all queries will be mockable.
 */
type QueriesThatCannotBeMocked = 'fetchInstanceData' | 'fetchProcessState' | 'fetchLayoutSettings' | 'fetchLayouts';

type MockableQueries = Omit<AppQueries, QueriesThatCannotBeMocked>;
type UnMockableQueries = Pick<AppQueries, QueriesThatCannotBeMocked>;

type MockedMutations = {
  [fn in keyof AppMutations]: {
    mock: AppMutations[fn];
    resolve: (retVal: Awaited<ReturnType<AppMutations[fn]>>) => void;
    reject: (error: Error) => void;
  };
};

type ReduxAction = Parameters<ReturnType<typeof setupStore>['store']['dispatch']>[0];
interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  renderer: () => React.ReactElement;
  router?: (props: PropsWithChildren) => React.ReactNode;
  waitUntilLoaded?: boolean;
  queries?: Partial<MockableQueries>;
  reduxState?: IRuntimeState;
  reduxGateKeeper?: (action: ReduxAction) => boolean;
}

interface BaseRenderOptions extends ExtendedRenderOptions {
  unMockableQueries?: Partial<UnMockableQueries>;
  Providers?: typeof DefaultProviders;
}

const exampleGuid = '75154373-aed4-41f7-95b4-e5b5115c2edc';
const exampleInstanceId = `512345/${exampleGuid}`;

export function promiseMock<T extends (...args: unknown[]) => unknown>() {
  const mock = jest.fn();
  const resolve = jest.fn();
  const reject = jest.fn();
  mock.mockImplementation(
    () =>
      new Promise<T>((res, rej) => {
        resolve.mockImplementation(res);
        reject.mockImplementation(rej);
      }),
  );

  return { mock, resolve, reject } as unknown as {
    mock: T;
    resolve: (retVal: Awaited<ReturnType<T>>) => void;
    reject: (error: Error) => void;
  };
}

const makeMutationMocks = (): MockedMutations => ({
  doAttachmentAddTag: promiseMock<AppMutations['doAttachmentAddTag']>(),
  doAttachmentRemove: promiseMock<AppMutations['doAttachmentRemove']>(),
  doAttachmentRemoveTag: promiseMock<AppMutations['doAttachmentRemoveTag']>(),
  doAttachmentUpload: promiseMock<AppMutations['doAttachmentUpload']>(),
  doInstantiate: promiseMock<AppMutations['doInstantiate']>(),
  doInstantiateWithPrefill: promiseMock<AppMutations['doInstantiateWithPrefill']>(),
  doProcessNext: promiseMock<AppMutations['doProcessNext']>(),
  doSetCurrentParty: promiseMock<AppMutations['doSetCurrentParty']>(),
});

const makeDefaultQueryMocks = (state: IRuntimeState): MockableQueries => ({
  fetchLogo: () => Promise.resolve(''),
  fetchApplicationMetadata: () => Promise.resolve(state.applicationMetadata.applicationMetadata!),
  fetchActiveInstances: () => Promise.resolve([]),
  fetchCurrentParty: () => Promise.resolve(getPartyMock()),
  fetchApplicationSettings: () => Promise.resolve({}),
  fetchFooterLayout: () => Promise.resolve({ footer: [] } as IFooterLayout),
  fetchLayoutSets: () => Promise.resolve(getLayoutSetsMock()),
  fetchOrgs: () => Promise.resolve({ orgs: getOrgsMock() }),
  fetchUserProfile: () => Promise.resolve(getProfileMock()),
  fetchDataModelSchema: () => Promise.resolve({}),
  fetchParties: () => Promise.resolve([getPartyMock()]),
  fetchRefreshJwtToken: () => Promise.resolve({}),
  fetchCustomValidationConfig: () => Promise.resolve(null),
  fetchFormData: () => Promise.resolve({}),
  fetchOptions: () => Promise.resolve({ data: [], headers: {} } as unknown as AxiosResponse<IOption[], any>),
  fetchDataList: () => Promise.resolve({} as unknown as IDataList),
  fetchPdfFormat: () => Promise.resolve({ excludedPages: [], excludedComponents: [] }),
  fetchDynamics: () => Promise.resolve(null),
  fetchRuleHandler: () => Promise.resolve(null),
  fetchTextResources: () => Promise.resolve({ language: 'nb', resources: getTextResourcesMock() }),
  fetchLayoutSchema: () => Promise.resolve({} as JSONSchema7),
  fetchAppLanguages: () => Promise.resolve([]),
  fetchProcessNextSteps: () => Promise.resolve([]),
});

const unMockableQueriesDefaults: UnMockableQueries = {
  fetchInstanceData: () => Promise.reject(new Error('fetchInstanceData not mocked')),
  fetchProcessState: () => Promise.reject(new Error('fetchProcessState not mocked')),
  fetchLayoutSettings: () => Promise.reject(new Error('fetchLayoutSettings not mocked')),
  fetchLayouts: () => Promise.reject(new Error('fetchLayouts not mocked')),
};

const defaultReduxGateKeeper = (action: ReduxAction) =>
  // We'll allow all the deprecated actions by default, as these have no side effects and are needed for things
  // like the AllOptionsProvider (along with summary of options-components) to work
  !!(action && 'type' in action && action.type.startsWith('deprecated/'));

function DefaultRouter({ children }: PropsWithChildren) {
  return (
    <MemoryRouter>
      <Routes>
        <Route
          path={'/'}
          element={<>{children}</>}
        />
      </Routes>
    </MemoryRouter>
  );
}

interface ProvidersProps extends PropsWithChildren {
  store: ReturnType<typeof setupStore>['store'];
  queries: AppQueriesContext;
  queryClient: QueryClient;
  Router?: (props: PropsWithChildren) => React.ReactNode;
}

function DefaultProviders({ children, store, queries, queryClient, Router = DefaultRouter }: ProvidersProps) {
  const theme = createTheme(AltinnAppTheme);
  return (
    <AppQueriesProvider
      {...queries}
      queryClient={queryClient}
    >
      <ReduxProvider store={store}>
        <LanguageProvider>
          <MuiThemeProvider theme={theme}>
            <ExprContextWrapper>
              <ApplicationMetadataProvider>
                <OrgsProvider>
                  <ApplicationSettingsProvider>
                    <LayoutSetsProvider>
                      <ProfileProvider>
                        <PartyProvider>
                          <TextResourcesProvider>
                            <FooterLayoutProvider>
                              <Router>
                                <InstantiationProvider>{children}</InstantiationProvider>
                              </Router>
                            </FooterLayoutProvider>
                          </TextResourcesProvider>
                        </PartyProvider>
                      </ProfileProvider>
                    </LayoutSetsProvider>
                  </ApplicationSettingsProvider>
                </OrgsProvider>
              </ApplicationMetadataProvider>
            </ExprContextWrapper>
          </MuiThemeProvider>
        </LanguageProvider>
      </ReduxProvider>
    </AppQueriesProvider>
  );
}

function MinimalProviders({ children, store, queries, queryClient, Router = DefaultRouter }: ProvidersProps) {
  return (
    <AppQueriesProvider
      {...queries}
      queryClient={queryClient}
    >
      <ReduxProvider store={store}>
        <Router>{children}</Router>
      </ReduxProvider>
    </AppQueriesProvider>
  );
}

const renderBase = async ({
  renderer,
  router,
  queries = {},
  waitUntilLoaded = true,
  unMockableQueries = {},
  reduxState,
  reduxGateKeeper = defaultReduxGateKeeper,
  Providers = DefaultProviders,
  ...renderOptions
}: BaseRenderOptions) => {
  const state = reduxState || getInitialStateMock();
  const { store } = setupStore(state);
  const mutations = makeMutationMocks();

  const queryClient = new QueryClient({
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

  let isInitializing = !!waitUntilLoaded;
  const originalDispatch = store.dispatch;
  const dispatchedActions: ReduxAction[] = [];
  const ignoredActions: ReduxAction[] = [];
  if (reduxGateKeeper) {
    jest.spyOn(store, 'dispatch').mockImplementation((action) => {
      const performDispatch = reduxGateKeeper(action);
      if (!isInitializing && !performDispatch && reduxGateKeeper === defaultReduxGateKeeper) {
        console.error(
          'Redux dispatch after initialization will be ignored without a reduxGateKeeper implementation:',
          action,
        );
      }

      performDispatch && dispatchedActions.push(action);
      !performDispatch && ignoredActions.push(action);
      performDispatch && originalDispatch(action);
    });
  }

  const finalQueries: AppQueries = {
    ...makeDefaultQueryMocks(state),
    ...queries,
    ...unMockableQueriesDefaults,
    ...unMockableQueries,
  };

  const queryMocks = Object.fromEntries(
    Object.entries(finalQueries).map(([key, value]) => [key, jest.fn().mockImplementation(value)]),
  ) as unknown as AppQueries;

  const mutationMocks = Object.fromEntries(
    Object.entries(mutations).map(([key, value]) => [key, value.mock]),
  ) as AppMutations;

  // This is useful if you really need to run an action in your tests, regardless of the reduxGateKeeper
  const originalDispatchWithAct = (action: ReduxAction) => {
    act(() => {
      dispatchedActions.push(action);
      originalDispatch(action);
    });
  };

  const children = renderer();
  const utils = rtlRender(
    <Providers
      Router={router}
      queryClient={queryClient}
      queries={{
        ...queryMocks,
        ...mutationMocks,
      }}
      store={store}
    >
      {children}
    </Providers>,
    renderOptions,
  );

  if (waitUntilLoaded) {
    // This may fail early if any of the providers fail to load, and will give you the provider/reason for failure
    await waitFor(() => {
      const loadingReason = utils.queryByTestId('loader')?.getAttribute('data-reason');
      /** @see setupTests.ts */
      (
        expect({
          loadingReason,
          queries: queryMocks,
          dispatchedActions,
          ignoredActions,
        }) as any
      ).toNotBeLoading();
    });

    // This is a little broader, as it will catch both the loading state
    // in renderGenericComponentTest() below, but also the <Loader /> component.
    await waitFor(() => expect(utils.queryByText('Loading...')).not.toBeInTheDocument());

    // This also catches any AltinnSpinner components inside the DOM
    await waitFor(() => expect(utils.queryByTestId('altinn-spinner')).not.toBeInTheDocument());

    // Clear the dispatch mock, as the app might trigger actions while loading
    (store.dispatch as jest.Mock).mockClear();
  }

  isInitializing = false;

  return {
    // The Redux store is returned here. Most notably, the store.dispatch function is mocked, so you can assert
    // on the actions that are dispatched during your tests. The mock is automatically reset if you use the
    // `waitUntilLoaded` option, so all actions dispatched here happened after the component finished loading.
    store,

    // If you need to dispatch actions to observe the real results, you can use this function in your tests.
    // It has already been wrapped in an act() call, so you don't need to do that yourself. If however, you want
    // any of the actions dispatched inside your component to actually have effects, you can provide a
    // `reduxGateKeeper` function in the render options.
    originalDispatch: originalDispatchWithAct,

    // The list of actions that were actually dispatched, and the ones that were caught but never actually dispatched:
    dispatchedActions,
    ignoredActions,

    // The initial state of the redux store as the component was rendered.
    initialState: state,

    // Mutations are returned, which allows you to assert on the mocked functions, and resolve/reject them.
    // None of our mutations do anything in any of the unit tests, so you'll have to provide your own responses
    // if you want to test the effects.
    mutations,

    // All queries are also returned, allowing you to assert on the mocked functions. All implementations
    // will have defaults, and you can provide your own mocks for any query by passing one in the `queries` prop.
    queries: queryMocks,

    // All the other utils from @testing-library/react
    ...utils,
  };
};

export const renderWithMinimalProviders = async (props: ExtendedRenderOptions) =>
  await renderBase({
    ...props,
    Providers: MinimalProviders,
  });

export const renderWithoutInstanceAndLayout = async (props: ExtendedRenderOptions) => await renderBase(props);
export const renderWithInstanceAndLayout = async ({
  renderer,
  reduxState: _reduxState,
  ...renderOptions
}: Omit<ExtendedRenderOptions, 'router'>) => {
  const reduxState = _reduxState || getInitialStateMock();
  let foundComponents = false;
  const layouts = JSON.parse(JSON.stringify(reduxState.formLayout.layouts || {})) as ILayouts;
  const layoutsAsCollection: ILayoutCollection = {};
  for (const key in layouts) {
    if (layouts[key]?.length) {
      foundComponents = true;
    }

    layoutsAsCollection[key] = {
      data: {
        layout: layouts[key] || [],
      },
    };
  }

  if (!foundComponents) {
    throw new Error('No components found, maybe you want to test with renderWithoutInstanceAndLayout() instead?');
  }

  function InstanceRouter({ children }: PropsWithChildren) {
    return (
      <MemoryRouter
        basename={'/ttd/test'}
        initialEntries={[`/ttd/test/instance/${exampleInstanceId}`]}
      >
        <Routes>
          <Route
            path={'instance/:partyId/:instanceGuid'}
            element={children}
          />
        </Routes>
      </MemoryRouter>
    );
  }

  return await renderBase({
    renderer: () => (
      <InstanceProvider provideLayoutValidation={false}>
        <WaitForNodes waitForAllNodes={true}>{renderer()}</WaitForNodes>
      </InstanceProvider>
    ),
    unMockableQueries: {
      fetchInstanceData: () => Promise.resolve(reduxState.deprecated.lastKnownInstance || getInstanceDataMock()),
      fetchProcessState: () => Promise.resolve(reduxState.deprecated.lastKnownProcess || getProcessDataMock()),
      fetchLayoutSettings: () =>
        Promise.resolve({
          pages: {
            order: Object.keys(layouts),
          },
        }),
      fetchLayouts: () => Promise.resolve(layoutsAsCollection),
    },
    router: InstanceRouter,
    reduxState,
    ...renderOptions,
  });
};

const WaitForNodes = ({
  children,
  waitForAllNodes,
  nodeId,
}: PropsWithChildren<{ waitForAllNodes: boolean; nodeId?: string }>) => {
  const layouts = useAppSelector((state) => state.formLayout.layouts);
  const currentView = useAppSelector((state) => state.formLayout.uiConfig.currentView);
  const repeatingGroups = useAppSelector((state) => state.formLayout.uiConfig.repeatingGroups);
  const nodes = useExprContext();

  const waitingFor: string[] = [];
  if (!layouts) {
    waitingFor.push('layouts');
  }
  if (!currentView) {
    waitingFor.push('currentView');
  }
  if (!repeatingGroups) {
    waitingFor.push('repeatingGroups');
  }

  const waitingForString = waitingFor.join(', ');
  if (waitingForString && waitForAllNodes) {
    return (
      <>
        <div>Loading...</div>
        <div>Waiting for {waitingForString}</div>
      </>
    );
  }

  if (!nodes && waitForAllNodes) {
    return (
      <>
        <div>Loading...</div>
        <div>Waiting for nodes</div>
      </>
    );
  }

  if (nodeId !== undefined && nodes && waitForAllNodes) {
    const node = nodes.findById(nodeId);
    if (!node) {
      return (
        <>
          <div>Unable to find target node: {nodeId}</div>
          <div>All other nodes loaded:</div>
          <ul>
            {nodes.allNodes().map((node) => (
              <li key={node.item.id}>{node.item.id}</li>
            ))}
          </ul>
        </>
      );
    }
  }

  return <>{children}</>;
};

export interface RenderWithNodeTestProps<T extends LayoutNode> extends Omit<ExtendedRenderOptions, 'renderer'> {
  renderer: (props: { node: T; root: LayoutPages }) => React.ReactElement;
  nodeId: string;
  inInstance?: boolean;
}

export async function renderWithNode<T extends LayoutNode = LayoutNode>({
  renderer,
  reduxState: _reduxState,
  inInstance = true,
  ...props
}: RenderWithNodeTestProps<T>) {
  const reduxState = _reduxState || getInitialStateMock();
  if (!reduxState.formLayout.layouts) {
    throw new Error('No layouts found, cannot render with nodes when no layout is in the redux state');
  }

  // The repeating groups state is required for nodes to work
  reduxState.formLayout.uiConfig.repeatingGroups =
    reduxState.formLayout.uiConfig.repeatingGroups || generateSimpleRepeatingGroups(reduxState.formLayout.layouts);

  function Child() {
    const root = useExprContext();

    if (!root) {
      return <div>Unable to find root context</div>;
    }

    const node = root.findById(props.nodeId);
    if (!node) {
      return <div>Unable to find node: {props.nodeId}</div>;
    }
    return renderer({ node: node as T, root });
  }

  return (inInstance ? renderWithInstanceAndLayout : renderWithoutInstanceAndLayout)({
    ...props,
    reduxState,
    renderer: () => (
      <WaitForNodes
        waitForAllNodes={true}
        nodeId={props.nodeId}
      >
        <Child />
      </WaitForNodes>
    ),
  });
}

export interface RenderGenericComponentTestProps<T extends CompTypes> extends Omit<ExtendedRenderOptions, 'renderer'> {
  type: T;
  renderer: (props: PropsFromGenericComponent<T>) => React.ReactElement;
  component?: Partial<CompExternalExact<T>>;
  genericProps?: Partial<PropsFromGenericComponent<T>>;
  inInstance?: boolean;
}

export async function renderGenericComponentTest<T extends CompTypes>({
  type,
  renderer,
  component,
  genericProps,
  reduxState: _reduxState,
  ...rest
}: RenderGenericComponentTestProps<T>) {
  const realComponentDef = {
    id: 'my-test-component-id',
    type,
    ...component,
  } as any;

  const reduxState = _reduxState || getInitialStateMock();
  if (!reduxState.formLayout.layouts) {
    throw new Error('No layouts found, cannot render generic component when no layout is in the redux state');
  }
  const firstLayout = Object.keys(reduxState.formLayout.layouts)[0];
  if (!firstLayout) {
    throw new Error('No layouts found, cannot render generic component when no layout is in the redux state');
  }

  reduxState.formLayout.layouts[firstLayout]!.push(realComponentDef);

  const Wrapper = ({ node }: { node: LayoutNode<T> }) => {
    const props: PropsFromGenericComponent<T> = {
      node,
      ...(mockGenericComponentProps as unknown as IComponentProps<T>),
      ...genericProps,
    };

    return renderer(props);
  };

  return renderWithNode<LayoutNode<T>>({
    ...rest,
    reduxState,
    nodeId: realComponentDef.id,
    renderer: Wrapper,
  });
}

const mockGenericComponentProps: IComponentProps<CompTypes> = {
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
