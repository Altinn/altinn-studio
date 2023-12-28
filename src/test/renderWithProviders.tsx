import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { PropsWithChildren } from 'react';

import { createTheme, MuiThemeProvider } from '@material-ui/core';
import { QueryClient } from '@tanstack/react-query';
import { act, render as rtlRender, waitFor } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import type { AxiosResponse } from 'axios';
import type { JSONSchema7 } from 'json-schema';

import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getLayoutSetsMock } from 'src/__mocks__/getLayoutSetsMock';
import { getLogoMock } from 'src/__mocks__/getLogoMock';
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
import { FormProvider } from 'src/features/form/FormContext';
import { PageNavigationProvider } from 'src/features/form/layout/PageNavigationContext';
import { LayoutSetsProvider } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { FormDataWriteGatekeepersProvider } from 'src/features/formData/FormDataWriteGatekeepers';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import { InstantiationProvider } from 'src/features/instantiate/InstantiationContext';
import { LanguageProvider } from 'src/features/language/LanguageProvider';
import { TextResourcesProvider } from 'src/features/language/textResources/TextResourcesProvider';
import { OrgsProvider } from 'src/features/orgs/OrgsProvider';
import { PartyProvider } from 'src/features/party/PartiesProvider';
import { ProfileProvider } from 'src/features/profile/ProfileProvider';
import { FormComponentContextProvider } from 'src/layout/FormComponentContext';
import { setupStore } from 'src/redux/store';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { useNodes } from 'src/utils/layout/NodesContext';
import type { IDataList } from 'src/features/dataLists';
import type { IFooterLayout } from 'src/features/footer/types';
import type { FormDataWriteGatekeepers } from 'src/features/formData/FormDataWriteGatekeepers';
import type { IComponentProps, PropsFromGenericComponent } from 'src/layout';
import type { IOption } from 'src/layout/common.generated';
import type { CompExternalExact, CompTypes } from 'src/layout/layout';
import type { AppMutations, AppQueries, AppQueriesContext } from 'src/queries/types';
import type { IRuntimeState } from 'src/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';

type ReduxAction = Parameters<ReturnType<typeof setupStore>['store']['dispatch']>[0];
interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  renderer: () => React.ReactElement;
  router?: (props: PropsWithChildren) => React.ReactNode;
  waitUntilLoaded?: boolean;
  queries?: Partial<AppQueries>;
  reduxState?: IRuntimeState;
  reduxGateKeeper?: (action: ReduxAction) => boolean;
}

interface InstanceRouterProps {
  initialPage?: string;
  taskId?: string;
  instanceId?: string;
}

interface ExtendedRenderOptionsWithInstance extends ExtendedRenderOptions, InstanceRouterProps {
  formDataMethods?: Partial<FormDataWriteGatekeepers>;
}

interface BaseRenderOptions extends ExtendedRenderOptions {
  Providers?: typeof DefaultProviders;
}

const exampleGuid = '75154373-aed4-41f7-95b4-e5b5115c2edc';
const exampleInstanceId = `512345/${exampleGuid}`;

export function queryPromiseMock<T extends keyof AppQueriesContext>(_name: T) {
  const mock = jest.fn().mockName(_name);
  const resolve = jest.fn().mockName(`${_name}.resolve`);
  const reject = jest.fn().mockName(`${_name}.reject`);
  mock.mockImplementation(
    () =>
      new Promise<T>((res, rej) => {
        resolve.mockImplementation(res);
        reject.mockImplementation(rej);
      }),
  );

  return { mock, resolve, reject } as unknown as {
    mock: AppQueriesContext[T];
    resolve: (retVal?: Awaited<ReturnType<AppQueriesContext[T]>>) => void;
    reject: (error: Error) => void;
  };
}

export const makeMutationMocks = <T extends (name: keyof AppMutations) => any>(
  makeMock: T,
): {
  [fn in keyof AppMutations]: ReturnType<T>;
} => ({
  doAttachmentAddTag: makeMock('doAttachmentAddTag'),
  doAttachmentRemove: makeMock('doAttachmentRemove'),
  doAttachmentRemoveTag: makeMock('doAttachmentRemoveTag'),
  doAttachmentUpload: makeMock('doAttachmentUpload'),
  doPutFormData: makeMock('doPutFormData'),
  doPostFormData: makeMock('doPostFormData'),
  doSetCurrentParty: makeMock('doSetCurrentParty'),
  doInstantiate: makeMock('doInstantiate'),
  doProcessNext: makeMock('doProcessNext'),
  doInstantiateWithPrefill: makeMock('doInstantiateWithPrefill'),
  doPerformAction: makeMock('doPerformAction'),
});

const makeDefaultQueryMocks = (state: IRuntimeState): AppQueries => ({
  fetchLogo: async () => getLogoMock(),
  fetchApplicationMetadata: async () => state.applicationMetadata.applicationMetadata!,
  fetchActiveInstances: async () => [],
  fetchCurrentParty: async () => getPartyMock(),
  fetchApplicationSettings: async () => ({}),
  fetchFooterLayout: async () => ({ footer: [] }) as IFooterLayout,
  fetchLayoutSets: async () => getLayoutSetsMock(),
  fetchOrgs: async () => ({ orgs: getOrgsMock() }),
  fetchUserProfile: async () => getProfileMock(),
  fetchDataModelSchema: async () => ({}),
  fetchParties: async () => [getPartyMock()],
  fetchRefreshJwtToken: async () => ({}),
  fetchCustomValidationConfig: async () => null,
  fetchFormData: async () => ({}),
  fetchOptions: async () => ({ data: [], headers: {} }) as unknown as AxiosResponse<IOption[], any>,
  fetchDataList: async () => ({}) as unknown as IDataList,
  fetchPdfFormat: async () => ({ excludedPages: [], excludedComponents: [] }),
  fetchDynamics: async () => null,
  fetchRuleHandler: async () => null,
  fetchTextResources: async () => ({ language: 'nb', resources: getTextResourcesMock() }),
  fetchLayoutSchema: async () => ({}) as JSONSchema7,
  fetchAppLanguages: async () => [],
  fetchProcessNextSteps: async () => [],
  fetchLayoutSettings: async () => ({ pages: { order: [] } }),
  fetchLayouts: () => Promise.reject(new Error('fetchLayouts not mocked')),
  fetchProcessState: async () => getProcessDataMock(),
  fetchInstanceData: async () => getInstanceDataMock(),
});

const defaultReduxGateKeeper = (action: ReduxAction) =>
  // We'll allow all the deprecated actions by default, as these have no side effects and are needed for things
  // like the AllOptionsProvider (along with summary of options-components) to work
  !!(action && 'type' in action && action.type.startsWith('deprecated/'));

export function makeDefaultFormDataMethodMocks(): FormDataWriteGatekeepers {
  const makeMockFn = <Name extends keyof FormDataWriteGatekeepers>(name: Name) =>
    jest
      .fn()
      .mockImplementation(() => true)
      .mockName(name);

  return {
    setLeafValue: makeMockFn('setLeafValue'),
    debounce: makeMockFn('debounce'),
    saveFinished: makeMockFn('saveFinished'),
    setMultiLeafValues: makeMockFn('setMultiLeafValues'),
    removeValueFromList: makeMockFn('removeValueFromList'),
    removeIndexFromList: makeMockFn('removeIndexFromList'),
    appendToListUnique: makeMockFn('appendToListUnique'),
    appendToList: makeMockFn('appendToList'),
    unlock: makeMockFn('unlock'),
    lock: makeMockFn('lock'),
    requestManualSave: makeMockFn('requestManualSave'),
  };
}

function NotFound() {
  const location = useLocation();
  return <div>Not found: {location.pathname}</div>;
}

function DefaultRouter({ children }: PropsWithChildren) {
  return (
    <MemoryRouter>
      <Routes>
        <Route
          path={'/'}
          element={<>{children}</>}
        />
        <Route
          path={'*'}
          element={<NotFound />}
        />
      </Routes>
    </MemoryRouter>
  );
}

export function InstanceRouter({
  children,
  instanceId = exampleInstanceId,
  taskId = 'Task_1',
  initialPage = 'FormLayout',
}: PropsWithChildren<InstanceRouterProps>) {
  return (
    <MemoryRouter
      basename={'/ttd/test'}
      initialEntries={[`/ttd/test/instance/${instanceId}/${taskId}/${initialPage}`]}
    >
      <Routes>
        <Route
          path={'instance/:partyId/:instanceGuid/:taskId/:pageId'}
          element={children}
        />
        <Route
          path={'instance/:partyId/:instanceGuid/:taskId'}
          element={children}
        />
        <Route
          path={'*'}
          element={<NotFound />}
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
            <PageNavigationProvider>
              <Router>
                <ApplicationMetadataProvider>
                  <OrgsProvider>
                    <ApplicationSettingsProvider>
                      <LayoutSetsProvider>
                        <ProfileProvider>
                          <PartyProvider>
                            <TextResourcesProvider>
                              <FooterLayoutProvider>
                                <InstantiationProvider>{children}</InstantiationProvider>
                              </FooterLayoutProvider>
                            </TextResourcesProvider>
                          </PartyProvider>
                        </ProfileProvider>
                      </LayoutSetsProvider>
                    </ApplicationSettingsProvider>
                  </OrgsProvider>
                </ApplicationMetadataProvider>
              </Router>
            </PageNavigationProvider>
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

interface SetupFakeAppProps {
  queries?: Partial<AppQueries>;
  mutations?: Partial<AppMutations>;
  reduxState?: IRuntimeState;
}

/**
 * This function bootstraps everything that is necessary to render a component with the same setup as the real app,
 * but with some default mocks for the queries and mutations, and a sensible state. This is exported so you can
 * use it when testing difficult problems that are unsuitable for unit tests.
 *
 * As an example, if you want to reproduce a bug in a browser (with all the nice React developer tools available there,
 * which may not be available in a unit test context) you can use this function to render all the basic providers
 * needed to render a component in something that looks like an app.
 */
export function setupFakeApp({ reduxState, queries, mutations }: SetupFakeAppProps = {}) {
  const state = reduxState || getInitialStateMock();
  const { store } = setupStore(state);

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

  const finalQueries: AppQueries = {
    ...makeDefaultQueryMocks(state),
    ...queries,
  };

  const finalMutations: AppMutations = {
    ...makeMutationMocks((name) => async () => {
      alert(`Mutation called: ${name}`);
      return undefined as any;
    }),
    ...mutations,
  };

  return {
    state,
    store,
    queryClient,
    queries: {
      ...finalQueries,
      ...finalMutations,
    },
    queriesOnly: finalQueries,
    mutationsOnly: finalMutations,
  };
}

const renderBase = async ({
  renderer,
  router,
  queries = {},
  waitUntilLoaded = true,
  reduxState,
  reduxGateKeeper = defaultReduxGateKeeper,
  Providers = DefaultProviders,
  ...renderOptions
}: BaseRenderOptions) => {
  let isInitializing = !!waitUntilLoaded;
  const {
    state,
    store,
    queryClient,
    queriesOnly: finalQueries,
  } = setupFakeApp({
    reduxState,
    queries,
  });
  const mutations = makeMutationMocks(queryPromiseMock);

  const originalDispatch = store.dispatch;
  const dispatchedActions: ReduxAction[] = [];
  const ignoredActions: ReduxAction[] = [];
  if (reduxGateKeeper) {
    jest.spyOn(store, 'dispatch').mockImplementation((action) => {
      const performDispatch = reduxGateKeeper(action);
      performDispatch && dispatchedActions.push(action);
      !performDispatch && ignoredActions.push(action);
      performDispatch && originalDispatch(action);
    });
  }

  const queryMocks = Object.fromEntries(
    Object.entries(finalQueries).map(([key, value]) => [key, jest.fn().mockImplementation(value).mockName(key)]),
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

  const ProviderWrapper = ({ children }: PropsWithChildren) => (
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
    </Providers>
  );

  const children = renderer();
  const utils = rtlRender(children, {
    ...renderOptions,
    wrapper: ProviderWrapper,
  });

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

export const renderWithoutInstanceAndLayout = async ({
  withFormProvider = false,
  ...rest
}: ExtendedRenderOptions & { withFormProvider?: boolean }) =>
  await renderBase({
    ...rest,
    Providers: withFormProvider
      ? ({ children, ...props }: ProvidersProps) => (
          <DefaultProviders {...props}>
            <FormProvider>{children}</FormProvider>
          </DefaultProviders>
        )
      : DefaultProviders,
  });

export const renderWithInstanceAndLayout = async ({
  renderer,
  reduxState: _reduxState,
  instanceId,
  taskId,
  initialPage = 'FormLayout',
  formDataMethods,
  ...renderOptions
}: ExtendedRenderOptionsWithInstance) => {
  const _formDataMethods = {
    ...makeDefaultFormDataMethodMocks(),
    ...formDataMethods,
  };

  if (renderOptions.router) {
    throw new Error('Cannot use custom router with renderWithInstanceAndLayout');
  }

  return {
    formDataMethods: _formDataMethods,
    ...(await renderBase({
      ...renderOptions,
      renderer: () => (
        <InstanceProvider>
          <FormDataWriteGatekeepersProvider value={_formDataMethods}>
            <FormProvider>
              <WaitForNodes waitForAllNodes={true}>{renderer()}</WaitForNodes>
            </FormProvider>
          </FormDataWriteGatekeepersProvider>
        </InstanceProvider>
      ),
      router: ({ children }) => (
        <InstanceRouter
          instanceId={instanceId}
          taskId={taskId}
          initialPage={initialPage}
        >
          {children}
        </InstanceRouter>
      ),
      queries: {
        fetchLayouts: async () => ({
          [initialPage]: {
            data: {
              layout: [
                {
                  id: 'noOtherComponentsHere',
                  type: 'Header',
                  textResourceBindings: {
                    title:
                      "You haven't added any components yet. Supply your own components " +
                      'by overriding the "fetchLayouts" query in your test.',
                  },
                  size: 'L',
                },
              ],
            },
          },
        }),
        fetchLayoutSettings: async () => ({
          pages: {
            order: [initialPage],
          },
        }),
        ...renderOptions.queries,
      },
    })),
  };
};

const WaitForNodes = ({
  children,
  waitForAllNodes,
  nodeId,
}: PropsWithChildren<{ waitForAllNodes: boolean; nodeId?: string }>) => {
  const nodes = useNodes();

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

export interface RenderWithNodeTestProps<T extends LayoutNode, InInstance extends boolean>
  extends Omit<ExtendedRenderOptions, 'renderer'>,
    InstanceRouterProps {
  renderer: (props: { node: T; root: LayoutPages }) => React.ReactElement;
  nodeId: string;
  inInstance: InInstance;
}

type RenderWithNodeReturnType<InInstance extends boolean> = InInstance extends false
  ? ReturnType<typeof renderWithoutInstanceAndLayout>
  : ReturnType<typeof renderWithInstanceAndLayout>;

export async function renderWithNode<InInstance extends boolean, T extends LayoutNode = LayoutNode>({
  renderer,
  reduxState: _reduxState,
  inInstance,
  ...props
}: RenderWithNodeTestProps<T, InInstance>): Promise<RenderWithNodeReturnType<InInstance>> {
  const reduxState = _reduxState || getInitialStateMock();
  if (!reduxState.formLayout.layouts) {
    throw new Error('No layouts found, cannot render with nodes when no layout is in the redux state');
  }

  function Child() {
    const root = useNodes();

    if (!root) {
      return <div>Unable to find root context</div>;
    }

    const node = root.findById(props.nodeId);
    if (!node) {
      return <div>Unable to find node: {props.nodeId}</div>;
    }
    return renderer({ node: node as T, root });
  }

  const funcToCall = inInstance === false ? renderWithoutInstanceAndLayout : renderWithInstanceAndLayout;
  const extraPropsNotInInstance: Partial<Parameters<typeof renderWithoutInstanceAndLayout>[0]> =
    inInstance === false ? { withFormProvider: true } : {};

  return (await funcToCall({
    ...props,
    ...extraPropsNotInInstance,
    reduxState,
    renderer: () => (
      <WaitForNodes
        waitForAllNodes={true}
        nodeId={props.nodeId}
      >
        <Child />
      </WaitForNodes>
    ),
  })) as unknown as RenderWithNodeReturnType<InInstance>;
}

export interface RenderGenericComponentTestProps<T extends CompTypes, InInstance extends boolean = true>
  extends Omit<ExtendedRenderOptions, 'renderer'>,
    InstanceRouterProps {
  type: T;
  renderer: (props: PropsFromGenericComponent<T>) => React.ReactElement;
  component?: Partial<CompExternalExact<T>>;
  genericProps?: Partial<PropsFromGenericComponent<T>>;
  inInstance?: InInstance;
}

export async function renderGenericComponentTest<T extends CompTypes, InInstance extends boolean = true>({
  type,
  renderer,
  component,
  genericProps,
  initialPage = 'FormLayout',
  ...rest
}: RenderGenericComponentTestProps<T, InInstance>) {
  const realComponentDef = {
    id: 'my-test-component-id',
    type,
    ...component,
  } as any;

  const Wrapper = ({ node }: { node: LayoutNode<T> }) => {
    const props: PropsFromGenericComponent<T> = {
      node,
      ...(mockGenericComponentProps as unknown as IComponentProps),
      ...genericProps,
    };

    return (
      <FormComponentContextProvider
        value={{
          node,
          baseComponentId: node.item.baseComponentId,
          id: node.item.id,
        }}
      >
        {renderer(props)}
      </FormComponentContextProvider>
    );
  };

  return renderWithNode<InInstance, LayoutNode<T>>({
    ...rest,
    nodeId: realComponentDef.id,
    renderer: Wrapper,
    inInstance: (rest.inInstance ?? true) as InInstance,
    initialPage,
    queries: {
      fetchLayouts: async () => ({
        [initialPage]: {
          data: {
            layout: [realComponentDef],
          },
        },
      }),
      fetchLayoutSettings: async () => ({
        pages: {
          order: [initialPage],
        },
      }),
      ...rest.queries,
    },
  });
}

const mockGenericComponentProps: IComponentProps = {
  containerDivRef: { current: null },
  isValid: undefined,
  componentValidations: {},
};
