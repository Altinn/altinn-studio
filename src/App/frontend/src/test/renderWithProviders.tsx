import React from 'react';
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes, useLocation } from 'react-router';
import type { PropsWithChildren } from 'react';

import { act, render as rtlRender, waitFor } from '@testing-library/react';
import { AxiosHeaders } from 'axios';
import dotenv from 'dotenv';
import { vi } from 'vitest';
import type { RenderOptions, waitForOptions } from '@testing-library/react';
import type { AxiosResponse } from 'axios';
import type { Mock } from 'vitest';

import { getDataListMock } from 'src/__mocks__/getDataListMock';
import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { getLogoMock } from 'src/__mocks__/getLogoMock';
import { orderDetailsResponsePayload } from 'src/__mocks__/getOrderDetailsPayloadMock';
import { getPartyMock } from 'src/__mocks__/getPartyMock';
import { paymentResponsePayload } from 'src/__mocks__/getPaymentPayloadMock';
import { AppLanguageTranslatorProvider } from 'src/AppLanguageTranslatorProvider';
import { AppQueriesProvider } from 'src/core/queries/AppQueriesProvider';
import { createTestQueryClient } from 'src/core/queries/queryClient';
import { RenderStart } from 'src/core/ui/RenderStart';
import { FormProvider } from 'src/features/form/FormProvider';
import { UiPreferencesProvider } from 'src/features/form/layout/UiPreferencesContext';
import { FormBootstrapResponse } from 'src/features/formBootstrap/types';
import { GlobalFormDataReadersProvider } from 'src/features/formData/FormDataReaders';
import { FormDataWriteProxyProvider } from 'src/features/formData/FormDataWriteProxies';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import { CurrentLanguageProvider } from 'src/features/language/LanguageProvider';
import { NavigationFocusStateProvider } from 'src/features/navigation/NavigationFocusStateContext';
import { PartyProvider } from 'src/features/party/PartiesProvider';
import { FormComponentContextProvider } from 'src/layout/FormComponentContext';
import { PageNavigationRouter } from 'src/test/routerUtils';
import type { AppMutations, AppQueries, AppQueriesContext } from 'src/core/queries/types';
import type { FormDataWriteProxies, Proxy } from 'src/features/formData/FormDataWriteProxies';
import type { FormDataMethods } from 'src/features/formData/FormDataWriteStateMachine';
import type { IComponentProps, PropsFromGenericComponent } from 'src/layout';
import type { CompExternal, CompExternalExact, CompTypes } from 'src/layout/layout';

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  renderer: (() => React.ReactElement) | React.ReactElement;
  router?: (props: PropsWithChildren) => React.ReactNode;
  waitUntilLoaded?: boolean;
  queries?: Partial<AppQueries>;
  mutations?: Partial<AppMutations>;
  initialRenderRef?: InitialRenderRef;
}

interface InstanceRouterProps {
  routerRef?: RouterRef;
  initialPath?: string;
  initialPage?: string;
  taskId?: string;
  instanceId?: string;
  alwaysRouteToChildren?: boolean;
  query?: string;
}

type RouterRef = { current: ReturnType<typeof createMemoryRouter> | undefined };

interface ExtendedRenderOptionsWithInstance extends ExtendedRenderOptions, Omit<InstanceRouterProps, 'routerRef'> {}

interface BaseRenderOptions extends ExtendedRenderOptions {
  Providers?: typeof DefaultProviders;
}

interface InitialRenderRef {
  current: boolean;
}

const env = dotenv.config({ quiet: true });

const exampleGuid = '75154373-aed4-41f7-95b4-e5b5115c2edc';
const exampleInstanceId = `512345/${exampleGuid}`;

/** The request functions are mocked; hooks, providers and the query cache still run. */
export function queryPromiseMock<Name extends keyof AppQueriesContext>(
  name: Name,
  implementation?: (
    ...args: Parameters<AppQueriesContext[Name]>
  ) => Promise<Awaited<ReturnType<AppQueriesContext[Name]>>>,
) {
  type Result = Awaited<ReturnType<AppQueriesContext[Name]>>;
  let finish: (value: Result) => void = () => {
    throw new Error('No pending request to resolve');
  };
  let fail: (error: Error) => void = () => {
    throw new Error('No pending request to reject');
  };
  const mock = vi
    .fn<(...args: Parameters<AppQueriesContext[Name]>) => Promise<Result>>(
      implementation ??
        ((..._args) =>
          new Promise<Result>((resolve, reject) => {
            finish = resolve;
            fail = reject;
          })),
    )
    .mockName(name);
  return { mock, resolve: (value: Result) => finish(value), reject: (error: Error) => fail(error) };
}

/** Complete HTTP response for the API methods that still return response metadata. */
export function httpResponse<T>(data: T): AxiosResponse<T> {
  return { data, status: 200, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() } };
}

// Mock postal codes data for testing. Uses the indexed format where:
// - places array contains unique place names (index 0 is null for "not found")
// - mapping array maps zip code (as index) to places array index
const defaultPostalCodesMock = (() => {
  const places: (string | null)[] = [null, 'OSLO', 'BERGEN', 'FREDRIKSTAD', 'KARDEMOMME BY'];
  const mapping = new Array(4610).fill(0);
  mapping[1] = 1; // 0001 -> OSLO
  mapping[2] = 2; // 0002 -> BERGEN
  mapping[1613] = 3; // 1613 -> FREDRIKSTAD
  mapping[4609] = 4; // 4609 -> KARDEMOMME BY
  return { places, mapping };
})();

export interface QueryOverrides {
  queries?: Partial<AppQueries>;
  mutations?: Partial<AppMutations>;
}

const defaultQueryMocks: AppQueries = {
  fetchLogo: async () => getLogoMock(),
  fetchRefreshJwtToken: async () => ({}),
  fetchFormData: async () => {
    throw new Error('Not implemented/overridden in test');
  },
  fetchOptions: async () => ({ data: [], headers: {} }),
  fetchDataList: async () => getDataListMock(),
  fetchLayouts: async () => ({}),
  fetchLayoutSchema: async () => ({}),
  fetchPaymentInformationForTask: async () => paymentResponsePayload,
  fetchOrderDetails: async () => orderDetailsResponsePayload,
  fetchPostalCodes: async () => defaultPostalCodesMock,
  fetchFormBootstrapForInstance: async () => getFormBootstrapMock(),
  fetchFormBootstrapForStateless: async () => getFormBootstrapMock(),
  fetchExternalApi: async () => {
    throw new Error('Override fetchExternalApi in this test');
  },
  fetchBackendValidations: async () => [],
  getInstance: async () => getInstanceWithProcessMock(),
  getActiveInstances: async () => [],
  getPartiesAllowedToInstantiateHierarchical: async () => [getPartyMock()],
  fetchTextResources: async (language) => ({ language, resources: [] }),
  fetchSigneeList: async () => [],
  fetchSigningDocuments: async () => [],
  fetchAuthorizedOrganizationDetails: async () => ({ organizations: [] }),
  fetchPerson: async () => {
    throw new Error('Override fetchPerson in this test');
  },
  fetchOrg: async () => {
    throw new Error('Override fetchOrg in this test');
  },
};

function createQueryMocks({ queries, mutations }: QueryOverrides = {}) {
  const queryMocks = Object.fromEntries(
    Object.entries({ ...defaultQueryMocks, ...queries }).map(([name, implementation]) => [
      name,
      vi.fn().mockImplementation(implementation).mockName(name),
    ]),
  ) as { [Name in keyof AppQueries]: Mock<AppQueries[Name]> };
  const mutationMocks = {
    doProcessNext: queryPromiseMock(
      'doProcessNext',
      mutations?.doProcessNext ?? (async () => httpResponse(getInstanceWithProcessMock())),
    ),
    doProcessResume: queryPromiseMock('doProcessResume', mutations?.doProcessResume),
    doAttachmentUpload: queryPromiseMock('doAttachmentUpload', mutations?.doAttachmentUpload),
    doUpdateAttachmentTags: queryPromiseMock(
      'doUpdateAttachmentTags',
      mutations?.doUpdateAttachmentTags ?? (async ({ setTagsRequest }) => ({ tags: setTagsRequest.tags })),
    ),
    doAttachmentRemove: queryPromiseMock('doAttachmentRemove', mutations?.doAttachmentRemove),
    doPerformAction: queryPromiseMock('doPerformAction', mutations?.doPerformAction),
    doSubformEntryAdd: queryPromiseMock('doSubformEntryAdd', mutations?.doSubformEntryAdd),
    doSubformEntryDelete: queryPromiseMock('doSubformEntryDelete', mutations?.doSubformEntryDelete),
    doPatchMultipleFormData: queryPromiseMock('doPatchMultipleFormData', mutations?.doPatchMultipleFormData),
    doPostStatelessFormData: queryPromiseMock('doPostStatelessFormData', mutations?.doPostStatelessFormData),
    createInstance: queryPromiseMock(
      'createInstance',
      mutations?.createInstance ?? (async () => getInstanceWithProcessMock()),
    ),
    createInstanceWithPrefill: queryPromiseMock(
      'createInstanceWithPrefill',
      mutations?.createInstanceWithPrefill ?? (async () => getInstanceWithProcessMock()),
    ),
    setSelectedParty: queryPromiseMock(
      'setSelectedParty',
      mutations?.setSelectedParty ??
        (async (): Promise<Awaited<ReturnType<AppMutations['setSelectedParty']>>> => 'Party successfully updated'),
    ),
  };
  const mutationFunctions = {
    doProcessNext: mutationMocks.doProcessNext.mock,
    doProcessResume: mutationMocks.doProcessResume.mock,
    doAttachmentUpload: mutationMocks.doAttachmentUpload.mock,
    doUpdateAttachmentTags: mutationMocks.doUpdateAttachmentTags.mock,
    doAttachmentRemove: mutationMocks.doAttachmentRemove.mock,
    doPerformAction: mutationMocks.doPerformAction.mock,
    doSubformEntryAdd: mutationMocks.doSubformEntryAdd.mock,
    doSubformEntryDelete: mutationMocks.doSubformEntryDelete.mock,
    doPatchMultipleFormData: mutationMocks.doPatchMultipleFormData.mock,
    doPostStatelessFormData: mutationMocks.doPostStatelessFormData.mock,
    createInstance: mutationMocks.createInstance.mock,
    createInstanceWithPrefill: mutationMocks.createInstanceWithPrefill.mock,
    setSelectedParty: mutationMocks.setSelectedParty.mock,
  };
  return {
    queries: { ...queryMocks, ...mutationFunctions },
    queriesOnly: queryMocks,
    mutationsOnly: mutationFunctions,
    mutations: mutationMocks,
  };
}

function makeProxy<Name extends keyof FormDataMethods>(name: Name, ref: InitialRenderRef) {
  const mock = vi.fn().mockName(name);
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
  const all: { [M in keyof FormDataMethods]: { mock: Mock; proxy: Proxy<M> } } = {
    debounce: makeProxy('debounce', ref),
    cancelSave: makeProxy('cancelSave', ref),
    saveFinished: makeProxy('saveFinished', ref),
    setLeafValue: makeProxy('setLeafValue', ref),
    setLeafValueInList: makeProxy('setLeafValueInList', ref),
    setMultiLeafValues: makeProxy('setMultiLeafValues', ref),
    removeValueFromList: makeProxy('removeValueFromList', ref),
    removeIndexFromList: makeProxy('removeIndexFromList', ref),
    removeFromListCallback: makeProxy('removeFromListCallback', ref),
    appendToListUnique: makeProxy('appendToListUnique', ref),
    appendToList: makeProxy('appendToList', ref),
    unlock: makeProxy('unlock', ref),
    lock: makeProxy('lock', ref),
    nextLock: makeProxy('nextLock', ref),
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
          path='/'
          element={children}
        />
        <Route
          path='*'
          element={<NotFound />}
        />
      </Routes>
    </MemoryRouter>
  );
}

export function InstanceRouter({
  children,
  routerRef,
  initialPath,
  instanceId = exampleInstanceId,
  taskId = 'Task_1',
  initialPage = 'FormLayout',
  alwaysRouteToChildren = false,
  query,
}: PropsWithChildren<InstanceRouterProps>) {
  const path = initialPath ?? `/ttd/test/instance/${instanceId}/${taskId}/${initialPage}`;
  const router = createMemoryRouter(
    [
      {
        path: 'instance/:instanceOwnerPartyId/:instanceGuid/:taskId/:pageId',
        element: children,
      },
      {
        path: 'instance/:instanceOwnerPartyId/:instanceGuid/:taskId',
        element: children,
      },
      {
        path: '*',
        element: alwaysRouteToChildren ? children : <NotFound />,
      },
    ],
    {
      basename: '/ttd/test',
      initialEntries: [query ? `${path}?${query}` : path],
    },
  );

  if (routerRef) {
    // eslint-disable-next-line react-compiler/react-compiler
    routerRef.current = router;
  }

  return <RouterProvider router={router} />;
}

export function StatelessRouter({
  children,
  routerRef,
  initialPage = 'FormLayout',
  alwaysRouteToChildren = false,
  query,
}: PropsWithChildren<Omit<InstanceRouterProps, 'taskId' | 'instanceId' | 'initialPath'>>) {
  const path = `/ttd/test/${initialPage}`;
  const router = createMemoryRouter(
    [
      {
        path: ':pageKey',
        element: children,
      },
      {
        path: '*',
        element: alwaysRouteToChildren ? children : <NotFound />,
      },
    ],
    {
      basename: '/ttd/test',
      initialEntries: [query ? `${path}?${query}` : path],
    },
  );

  if (routerRef) {
    // eslint-disable-next-line react-compiler/react-compiler
    routerRef.current = router;
  }

  return <RouterProvider router={router} />;
}

interface ProvidersProps extends PropsWithChildren {
  queries: AppQueriesContext;
  queryClient: ReturnType<typeof createTestQueryClient>;
  Router?: (props: PropsWithChildren) => React.ReactNode;
}

function DefaultProviders({ children, queries, queryClient, Router = DefaultRouter }: ProvidersProps) {
  return (
    <AppQueriesProvider
      {...queries}
      queryClient={queryClient}
    >
      <UiPreferencesProvider>
        <Router>
          <CurrentLanguageProvider>
            <NavigationFocusStateProvider>
              <GlobalFormDataReadersProvider>
                <PartyProvider>{children}</PartyProvider>
              </GlobalFormDataReadersProvider>
            </NavigationFocusStateProvider>
          </CurrentLanguageProvider>
        </Router>
      </UiPreferencesProvider>
    </AppQueriesProvider>
  );
}

interface InstanceProvidersProps extends PropsWithChildren {
  formDataProxies: FormDataWriteProxies;
}

function InstanceFormAndLayoutProviders({ children, formDataProxies }: InstanceProvidersProps) {
  return (
    <InstanceProvider>
      <FormDataWriteProxyProvider value={formDataProxies}>
        <FormProvider>
          <AppLanguageTranslatorProvider>{children}</AppLanguageTranslatorProvider>
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
      <Router>
        <CurrentLanguageProvider>
          <NavigationFocusStateProvider>{children}</NavigationFocusStateProvider>
        </CurrentLanguageProvider>
      </Router>
    </AppQueriesProvider>
  );
}

/** Create an isolated cache and flat request mocks for a test render. */
export function setupFakeApp(overrides: QueryOverrides = {}) {
  return { queryClient: createTestQueryClient(), ...createQueryMocks(overrides) };
}

const renderBase = async ({
  renderer,
  router,
  queries,
  mutations,
  waitUntilLoaded = true,
  Providers = DefaultProviders,
  initialRenderRef = { current: true },
  ...renderOptions
}: BaseRenderOptions) => {
  const {
    queryClient,
    queries: finalQueries,
    queriesOnly,
    mutations: mutationMocks,
  } = setupFakeApp({ queries, mutations });

  if (!router) {
    throw new Error('No router provided');
  }

  const ProviderWrapper = ({ children }: PropsWithChildren) => (
    <Providers
      Router={router}
      queryClient={queryClient}
      queries={finalQueries}
    >
      <RenderStart
        devTools={false}
        dataModelFetcher={false}
      >
        <AppLanguageTranslatorProvider>{children}</AppLanguageTranslatorProvider>
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
        for (const [name, fn] of Object.entries(finalQueries)) {
          for (const args of fn.mock.calls) {
            const argsAsStr = args.map((arg) => JSON.stringify(arg)).join(', ');
            queryCalls.push(`- ${name}(${argsAsStr})`);
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
    queries: queriesOnly,
    mutations: mutationMocks,

    // All the other utils from @testing-library/react
    ...utils,
  };
};

export const renderWithMinimalProviders = async (props: ExtendedRenderOptions) =>
  await renderBase({
    ...props,
    router: props.router ?? PageNavigationRouter({ currentPageId: 'formLayout' }),
    Providers: MinimalProviders,
  });

export const renderWithDefaultProviders = async (props: ExtendedRenderOptions) =>
  await renderBase({
    ...props,
    router: props.router ?? DefaultRouter,
    Providers: DefaultProviders,
  });

export const renderWithoutInstanceAndLayout = async ({
  withFormProvider = false,
  ...rest
}: ExtendedRenderOptions & { withFormProvider?: boolean }) =>
  await renderBase({
    ...rest,
    router: rest.router ?? DefaultRouter,
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
  initialPath,
  alwaysRouteToChildren,
  initialPage = 'FormLayout',
  query,
  ...renderOptions
}: ExtendedRenderOptionsWithInstance) => {
  const initialRenderRef: InitialRenderRef = { current: true };
  const { mocks: formDataMethods, proxies: formDataProxies } = makeFormDataMethodProxies(initialRenderRef);

  if (renderOptions.router) {
    throw new Error('Cannot use custom router with renderWithInstanceAndLayout');
  }

  const realTaskId = taskId ?? 'Task_1';
  if (
    window.altinnAppGlobalData.ui.folders[realTaskId]?.pages &&
    'order' in window.altinnAppGlobalData.ui.folders[realTaskId].pages &&
    !window.altinnAppGlobalData.ui.folders[realTaskId].pages.order.includes(initialPage)
  ) {
    window.altinnAppGlobalData.ui.folders[realTaskId].pages.order = [initialPage];
  }

  const routerRef: RouterRef = { current: undefined };
  return {
    formDataMethods,
    routerRef,
    ...(await renderBase({
      ...renderOptions,
      initialRenderRef,
      renderer,
      Providers: ({ children, ...props }: ProvidersProps) => (
        <DefaultProviders {...props}>
          <InstanceFormAndLayoutProviders formDataProxies={formDataProxies}>{children}</InstanceFormAndLayoutProviders>
        </DefaultProviders>
      ),
      router: ({ children }) => (
        <InstanceRouter
          routerRef={routerRef}
          instanceId={instanceId}
          taskId={taskId}
          initialPath={initialPath}
          initialPage={initialPage}
          alwaysRouteToChildren={alwaysRouteToChildren}
          query={query}
        >
          {children}
        </InstanceRouter>
      ),
      queries: {
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((obj) => {
            obj.layouts = {
              [initialPage]: {
                data: {
                  layout: [
                    {
                      id: 'noOtherComponentsHere',
                      type: 'Heading',
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
            };
          }),
        ...renderOptions.queries,
      },
    })),
  };
};

export interface RenderGenericComponentTestProps<T extends CompTypes, InInstance extends boolean = true>
  extends Omit<ExtendedRenderOptions, 'renderer'>, Omit<InstanceRouterProps, 'routerRef'> {
  type: T;
  renderer: (props: PropsFromGenericComponent<T>) => React.ReactElement;
  component?: Partial<CompExternalExact<T>>;
  genericProps?: Partial<PropsFromGenericComponent<T>>;
  inInstance?: InInstance;
}

type RenderGenericComponentReturnType<InInstance extends boolean> = InInstance extends false
  ? ReturnType<typeof renderWithoutInstanceAndLayout>
  : ReturnType<typeof renderWithInstanceAndLayout>;

export async function renderGenericComponentTest<T extends CompTypes, InInstance extends boolean = true>({
  type,
  renderer,
  component,
  genericProps,
  initialPage = 'FormLayout',
  ...rest
}: RenderGenericComponentTestProps<T, InInstance>): Promise<RenderGenericComponentReturnType<InInstance>> {
  const realComponentDef = {
    id: 'my-test-component-id',
    type,
    ...component,
  } as CompExternal;

  const Wrapper = () => {
    const props: PropsFromGenericComponent<T> = {
      baseComponentId: realComponentDef.id,
      ...(mockGenericComponentProps as unknown as IComponentProps),
      ...genericProps,
    };

    return (
      <FormComponentContextProvider value={{ baseComponentId: realComponentDef.id }}>
        {renderer(props)}
      </FormComponentContextProvider>
    );
  };

  async function formBootstrap(
    ...args: Parameters<AppQueries['fetchFormBootstrapForInstance']>
  ): Promise<FormBootstrapResponse> {
    const mock =
      (inInstance ? await rest.queries?.fetchFormBootstrapForInstance?.(...args) : undefined) ??
      (!inInstance ? await rest.queries?.fetchFormBootstrapForStateless?.(...args) : undefined) ??
      getFormBootstrapMock();

    if (
      !Object.hasOwn(mock.layouts, initialPage) ||
      !mock.layouts[initialPage]?.data.layout.some((c) => c.id === realComponentDef.id)
    ) {
      mock.layouts = {
        [initialPage]: {
          data: {
            layout: [realComponentDef],
          },
        },
      };
    }

    return mock;
  }

  const inInstance = (rest.inInstance ?? true) as InInstance;
  const funcToCall = inInstance ? renderWithInstanceAndLayout : renderWithoutInstanceAndLayout;
  return funcToCall({
    ...rest,
    renderer: Wrapper,
    initialPage,
    queries: {
      ...rest.queries,
      fetchFormBootstrapForInstance: formBootstrap,
      fetchFormBootstrapForStateless: formBootstrap,
    },
  }) as RenderGenericComponentReturnType<InInstance>;
}

const mockGenericComponentProps: IComponentProps = {
  containerDivRef: { current: null },
};
