import React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { PropsWithChildren } from 'react';

import { jest } from '@jest/globals';
import { createTheme, MuiThemeProvider } from '@material-ui/core';
import { QueryClient } from '@tanstack/react-query';
import { act, render as rtlRender, waitFor } from '@testing-library/react';
import dotenv from 'dotenv';
import type { RenderOptions, waitForOptions } from '@testing-library/react';
import type { AxiosResponse } from 'axios';
import type { JSONSchema7 } from 'json-schema';

import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getLayoutSetsMock } from 'src/__mocks__/getLayoutSetsMock';
import { getLogoMock } from 'src/__mocks__/getLogoMock';
import { orderDetailsResponsePayload } from 'src/__mocks__/getOrderDetailsPayloadMock';
import { getOrgsMock } from 'src/__mocks__/getOrgsMock';
import { getPartyMock } from 'src/__mocks__/getPartyMock';
import { paymentResponsePayload } from 'src/__mocks__/getPaymentPayloadMock';
import { getProcessDataMock } from 'src/__mocks__/getProcessDataMock';
import { getProfileMock } from 'src/__mocks__/getProfileMock';
import { getTextResourcesMock } from 'src/__mocks__/getTextResourcesMock';
import { AppQueriesProvider } from 'src/core/contexts/AppQueriesProvider';
import { RenderStart } from 'src/core/ui/RenderStart';
import { ApplicationMetadataProvider } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { ApplicationSettingsProvider } from 'src/features/applicationSettings/ApplicationSettingsProvider';
import { FormProvider } from 'src/features/form/FormContext';
import { PageNavigationProvider } from 'src/features/form/layout/PageNavigationContext';
import { UiConfigProvider } from 'src/features/form/layout/UiConfigContext';
import { LayoutSetsProvider } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { GlobalFormDataReadersProvider } from 'src/features/formData/FormDataReaders';
import { FormDataWriteProxyProvider } from 'src/features/formData/FormDataWriteProxies';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import { InstantiationProvider } from 'src/features/instantiate/InstantiationContext';
import { LangToolsStoreProvider } from 'src/features/language/LangToolsStore';
import { LanguageProvider } from 'src/features/language/LanguageProvider';
import { TextResourcesProvider } from 'src/features/language/textResources/TextResourcesProvider';
import { OrgsProvider } from 'src/features/orgs/OrgsProvider';
import { PartyProvider } from 'src/features/party/PartiesProvider';
import { ProfileProvider } from 'src/features/profile/ProfileProvider';
import { AppRoutingProvider } from 'src/features/routing/AppRoutingContext';
import { FormComponentContextProvider } from 'src/layout/FormComponentContext';
import { PageNavigationRouter } from 'src/test/routerUtils';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { useNodes } from 'src/utils/layout/NodesContext';
import { useNodeTraversalSelectorSilent } from 'src/utils/layout/useNodeTraversal';
import type { IDataList } from 'src/features/dataLists';
import type { IFooterLayout } from 'src/features/footer/types';
import type { FormDataWriteProxies, Proxy } from 'src/features/formData/FormDataWriteProxies';
import type { FormDataMethods } from 'src/features/formData/FormDataWriteStateMachine';
import type { IComponentProps, PropsFromGenericComponent } from 'src/layout';
import type { IRawOption } from 'src/layout/common.generated';
import type { CompExternalExact, CompTypes } from 'src/layout/layout';
import type { AppMutations, AppQueries, AppQueriesContext } from 'src/queries/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  renderer: (() => React.ReactElement) | React.ReactElement;
  router?: (props: PropsWithChildren) => React.ReactNode;
  waitUntilLoaded?: boolean;
  queries?: Partial<AppQueries>;
  initialRenderRef?: InitialRenderRef;
}

interface InstanceRouterProps {
  initialPage?: string;
  taskId?: string;
  instanceId?: string;
  alwaysRouteToChildren?: boolean;
}

interface ExtendedRenderOptionsWithInstance extends ExtendedRenderOptions, InstanceRouterProps {}

interface BaseRenderOptions extends ExtendedRenderOptions {
  Providers?: typeof DefaultProviders;
}

interface InitialRenderRef {
  current: boolean;
}

const env = dotenv.config();

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const makeMutationMocks = <T extends (name: keyof AppMutations) => any>(
  makeMock: T,
): {
  [fn in keyof AppMutations]: ReturnType<T>;
} => ({
  doAttachmentAddTag: makeMock('doAttachmentAddTag'),
  doAttachmentRemove: makeMock('doAttachmentRemove'),
  doAttachmentRemoveTag: makeMock('doAttachmentRemoveTag'),
  doAttachmentUpload: makeMock('doAttachmentUpload'),
  doPatchFormData: makeMock('doPatchFormData'),
  doPostStatelessFormData: makeMock('doPostStatelessFormData'),
  doSetCurrentParty: makeMock('doSetCurrentParty'),
  doInstantiate: makeMock('doInstantiate'),
  doProcessNext: makeMock('doProcessNext'),
  doInstantiateWithPrefill: makeMock('doInstantiateWithPrefill'),
  doPerformAction: makeMock('doPerformAction'),
});

const defaultQueryMocks: AppQueries = {
  fetchLogo: async () => getLogoMock(),
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchOptions: async () => ({ data: [], headers: {} }) as unknown as AxiosResponse<IRawOption[], any>,
  fetchDataList: async () => ({}) as unknown as IDataList,
  fetchPdfFormat: async () => ({ excludedPages: [], excludedComponents: [] }),
  fetchDynamics: async () => null,
  fetchRuleHandler: async () => null,
  fetchTextResources: async () => ({ language: 'nb', resources: getTextResourcesMock() }),
  fetchLayoutSchema: async () => ({}) as JSONSchema7,
  fetchAppLanguages: async () => [],
  fetchProcessNextSteps: async () => [],
  fetchPostPlace: async () => ({ valid: true, result: 'OSLO' }),
  fetchLayoutSettings: async () => ({ pages: { order: [] } }),
  fetchLayouts: () => Promise.reject(new Error('fetchLayouts not mocked')),
  fetchProcessState: async () => getProcessDataMock(),
  fetchInstanceData: async () => getInstanceDataMock(),
  fetchBackendValidations: async () => [],
  fetchPaymentInformation: async () => paymentResponsePayload,
  fetchOrderDetails: async () => orderDetailsResponsePayload,
};

function makeProxy<Name extends keyof FormDataMethods>(name: Name, ref: InitialRenderRef) {
  const mock = jest.fn().mockName(name);
  const proxy: Proxy<Name> = (original) => ({
    proxy: ({ args, toCall }) => {
      if (ref.current) {
        // eslint-disable-next-line prefer-spread, @typescript-eslint/no-explicit-any
        (toCall as any).apply(null, args);
        return;
      }

      act(() => {
        // eslint-disable-next-line prefer-spread, @typescript-eslint/no-explicit-any
        (toCall as any).apply(null, args);
      });
    },
    method: mock.mockImplementation(original),
  });

  return { proxy, mock };
}

export const makeFormDataMethodProxies = (
  ref: InitialRenderRef,
): { proxies: FormDataWriteProxies; mocks: FormDataMethods } => {
  const all: { [M in keyof FormDataMethods]: { mock: jest.Mock; proxy: Proxy<M> } } = {
    debounce: makeProxy('debounce', ref),
    cancelSave: makeProxy('cancelSave', ref),
    saveFinished: makeProxy('saveFinished', ref),
    setLeafValue: makeProxy('setLeafValue', ref),
    setMultiLeafValues: makeProxy('setMultiLeafValues', ref),
    removeValueFromList: makeProxy('removeValueFromList', ref),
    removeIndexFromList: makeProxy('removeIndexFromList', ref),
    removeFromListCallback: makeProxy('removeFromListCallback', ref),
    appendToListUnique: makeProxy('appendToListUnique', ref),
    appendToList: makeProxy('appendToList', ref),
    unlock: makeProxy('unlock', ref),
    lock: makeProxy('lock', ref),
    requestManualSave: makeProxy('requestManualSave', ref),
  };

  const proxies: FormDataWriteProxies = Object.fromEntries(
    Object.entries(all).map(([name, { proxy }]) => [name, proxy]),
  ) as unknown as FormDataWriteProxies;

  const mocks: FormDataMethods = Object.fromEntries(
    Object.entries(all).map(([name, { mock }]) => [name, mock]),
  ) as unknown as FormDataMethods;

  return { proxies, mocks };
};

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

export function InstanceRouter({
  children,
  instanceId = exampleInstanceId,
  taskId = 'Task_1',
  initialPage = 'FormLayout',
  alwaysRouteToChildren = false,
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
          element={alwaysRouteToChildren ? children : <NotFound />}
        />
      </Routes>
    </MemoryRouter>
  );
}

interface ProvidersProps extends PropsWithChildren {
  queries: AppQueriesContext;
  queryClient: QueryClient;
  Router?: (props: PropsWithChildren) => React.ReactNode;
}

function DefaultProviders({ children, queries, queryClient, Router = DefaultRouter }: ProvidersProps) {
  const theme = createTheme(AltinnAppTheme);
  return (
    <AppQueriesProvider
      {...queries}
      queryClient={queryClient}
    >
      <LanguageProvider>
        <LangToolsStoreProvider>
          <MuiThemeProvider theme={theme}>
            <UiConfigProvider>
              <PageNavigationProvider>
                <Router>
                  <AppRoutingProvider>
                    <ApplicationMetadataProvider>
                      <GlobalFormDataReadersProvider>
                        <OrgsProvider>
                          <ApplicationSettingsProvider>
                            <LayoutSetsProvider>
                              <ProfileProvider>
                                <PartyProvider>
                                  <TextResourcesProvider>
                                    <InstantiationProvider>{children}</InstantiationProvider>
                                  </TextResourcesProvider>
                                </PartyProvider>
                              </ProfileProvider>
                            </LayoutSetsProvider>
                          </ApplicationSettingsProvider>
                        </OrgsProvider>
                      </GlobalFormDataReadersProvider>
                    </ApplicationMetadataProvider>
                  </AppRoutingProvider>
                </Router>
              </PageNavigationProvider>
            </UiConfigProvider>
          </MuiThemeProvider>
        </LangToolsStoreProvider>
      </LanguageProvider>
    </AppQueriesProvider>
  );
}

interface InstanceProvidersProps extends PropsWithChildren {
  formDataProxies: FormDataWriteProxies;
  waitForAllNodes: boolean;
}

function InstanceFormAndLayoutProviders({ children, formDataProxies, waitForAllNodes }: InstanceProvidersProps) {
  return (
    <InstanceProvider>
      <FormDataWriteProxyProvider value={formDataProxies}>
        <FormProvider>
          <WaitForNodes waitForAllNodes={waitForAllNodes}>{children}</WaitForNodes>
        </FormProvider>
      </FormDataWriteProxyProvider>
    </InstanceProvider>
  );
}

function MinimalProviders({ children, queries, queryClient, Router = DefaultRouter }: ProvidersProps) {
  return (
    <AppQueriesProvider
      {...queries}
      queryClient={queryClient}
    >
      <LangToolsStoreProvider>
        <Router>
          <AppRoutingProvider>{children}</AppRoutingProvider>
        </Router>
      </LangToolsStoreProvider>
    </AppQueriesProvider>
  );
}

interface SetupFakeAppProps {
  queries?: Partial<AppQueries>;
  mutations?: Partial<AppMutations>;
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
export function setupFakeApp({ queries, mutations }: SetupFakeAppProps = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false, staleTime: Infinity },
    },
  });

  const finalQueries: AppQueries = {
    ...defaultQueryMocks,
    ...queries,
  };

  const finalMutations: AppMutations = {
    ...makeMutationMocks((name) => async () => {
      alert(`Mutation called: ${name}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return undefined as any;
    }),
    ...mutations,
  };

  return {
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
  Providers = DefaultProviders,
  initialRenderRef = { current: true },
  ...renderOptions
}: BaseRenderOptions) => {
  const { queryClient, queriesOnly: finalQueries } = setupFakeApp({ queries });
  const mutations = makeMutationMocks(queryPromiseMock);

  const queryMocks = Object.fromEntries(
    Object.entries(finalQueries).map(([key, value]) => [key, jest.fn().mockImplementation(value).mockName(key)]),
  ) as unknown as AppQueries;

  const mutationMocks = Object.fromEntries(
    Object.entries(mutations).map(([key, value]) => [key, value.mock]),
  ) as AppMutations;

  const ProviderWrapper = ({ children }: PropsWithChildren) => (
    <Providers
      Router={router || PageNavigationRouter({ currentPageId: 'formLayout' })}
      queryClient={queryClient}
      queries={{
        ...queryMocks,
        ...mutationMocks,
      }}
    >
      <RenderStart
        devTools={false}
        dataModelFetcher={false}
      >
        {children}
      </RenderStart>
    </Providers>
  );

  const startTime = Date.now();
  const children = typeof renderer === 'function' ? renderer() : renderer;
  const utils = rtlRender(children, {
    ...renderOptions,
    wrapper: ProviderWrapper,
  });

  if (waitUntilLoaded) {
    let loadingReason: string | null | undefined = 'did not start waiting';
    const timeout = env.parsed?.WAITFOR_TIMEOUT ? parseInt(env.parsed.WAITFOR_TIMEOUT, 10) : 15000;
    const waitOptions: waitForOptions = {
      timeout,
      onTimeout: () => {
        const queryCalls: string[] = [];
        for (const [name, fn] of Object.entries(queryMocks)) {
          const mock = (fn as jest.Mock).mock;
          if (mock.calls.length > 0) {
            for (const args of mock.calls) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const argsAsStr = args.map((arg: any) => JSON.stringify(arg)).join(', ');
              queryCalls.push(`- ${name}(${argsAsStr})`);
            }
          }
        }

        const runTime = Date.now() - startTime;
        const runTimeStr = runTime > 1000 ? `${(runTime / 1000).toFixed(2)}s` : `${runTime}ms`;

        const msg = [
          `Expected to not be loading, but was loading because of '${loadingReason}'.`,
          `Run time: ${runTimeStr}`,
          '',
          `Queries called:`,
          ...queryCalls,
          '',
          'Consider if you need to increase WAITFOR_TIMEOUT if your machine is slow.',
        ].join('\n');

        return new Error(msg);
      },
    };

    // This may fail early if any of the providers fail to load, and will give you the provider/reason for failure
    await waitFor(() => {
      loadingReason = utils.queryByTestId('loader')?.getAttribute('data-reason');
      return expect(!loadingReason).toBeTruthy();
    }, waitOptions);

    // This is a little broader, as it will catch both the loading state
    // in renderGenericComponentTest() below, but also the <Loader /> component.
    await waitFor(() => {
      loadingReason = 'Text "Loading..." found in document';
      return expect(utils.queryByText('Loading...')).not.toBeInTheDocument();
    }, waitOptions);

    // This also catches any AltinnSpinner components inside the DOM
    await waitFor(() => {
      loadingReason = 'AltinnSpinner found in document (testid: altinn-spinner)';
      return expect(utils.queryByTestId('altinn-spinner')).not.toBeInTheDocument();
    }, waitOptions);
  }

  initialRenderRef.current = false;

  return {
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
  instanceId,
  taskId,
  alwaysRouteToChildren,
  initialPage = 'FormLayout',
  ...renderOptions
}: ExtendedRenderOptionsWithInstance) => {
  const initialRenderRef: InitialRenderRef = { current: true };
  const { mocks: formDataMethods, proxies: formDataProxies } = makeFormDataMethodProxies(initialRenderRef);

  if (renderOptions.router) {
    throw new Error('Cannot use custom router with renderWithInstanceAndLayout');
  }

  return {
    formDataMethods,
    ...(await renderBase({
      ...renderOptions,
      initialRenderRef,
      renderer,
      Providers: ({ children, ...props }: ProvidersProps) => (
        <DefaultProviders {...props}>
          <InstanceFormAndLayoutProviders
            formDataProxies={formDataProxies}
            waitForAllNodes={true}
          >
            {children}
          </InstanceFormAndLayoutProviders>
        </DefaultProviders>
      ),
      router: ({ children }) => (
        <InstanceRouter
          instanceId={instanceId}
          taskId={taskId}
          initialPage={initialPage}
          alwaysRouteToChildren={alwaysRouteToChildren}
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
  const selector = useNodeTraversalSelectorSilent();

  if (!nodes && waitForAllNodes) {
    return (
      <>
        <div>Loading...</div>
        <div>Waiting for nodes</div>
      </>
    );
  }

  if (nodeId !== undefined && nodes && waitForAllNodes) {
    const node = selector((t) => t.findById(nodeId), [nodeId]);
    if (!node) {
      const allNodes = selector((t) => t.allNodes(), []);
      return (
        <>
          <div>Unable to find target node: {nodeId}</div>
          {allNodes && (
            <>
              <div>All other nodes loaded:</div>
              <ul>
                {allNodes.map((node) => (
                  <li key={node.id}>{node.id}</li>
                ))}
              </ul>
            </>
          )}
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
  inInstance,
  ...props
}: RenderWithNodeTestProps<T, InInstance>): Promise<RenderWithNodeReturnType<InInstance>> {
  function Child() {
    const root = useNodes();
    const selector = useNodeTraversalSelectorSilent();

    if (!root) {
      return <div>Unable to find root context</div>;
    }

    const node = selector((t) => t.findById(props.nodeId), [props.nodeId]);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          baseComponentId: node.baseId,
          id: node.id,
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
};
