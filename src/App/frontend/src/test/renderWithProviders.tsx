import React from 'react';
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes, useLocation } from 'react-router';
import type { PropsWithChildren } from 'react';

import { act, render as rtlRender, waitFor } from '@testing-library/react';
import dotenv from 'dotenv';
import { vi } from 'vitest';
import type { RenderOptions, waitForOptions } from '@testing-library/react';
import type { Mock } from 'vitest';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { AppLanguageTranslatorProvider } from 'src/AppLanguageTranslatorProvider';
import { ApiProvider } from 'src/core/contexts/ApiProvider';
import { createTestQueryClient } from 'src/core/queries/queryClient';
import { AppQueryProvider } from 'src/core/queries/QueryProvider';
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
import { createApiMocks } from 'src/test/apiMocks';
import { PageNavigationRouter } from 'src/test/routerUtils';
import type { ApiClients } from 'src/core/api-client/ApiClients';
import type { FormBootstrapApi } from 'src/core/api-client/app.api';
import type { FormDataWriteProxies, Proxy } from 'src/features/formData/FormDataWriteProxies';
import type { FormDataMethods } from 'src/features/formData/FormDataWriteStateMachine';
import type { IComponentProps, PropsFromGenericComponent } from 'src/layout';
import type { CompExternal, CompExternalExact, CompTypes } from 'src/layout/layout';
import type { ApiOverrides } from 'src/test/apiMocks';

export type { ApiOverrides };

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  renderer: (() => React.ReactElement) | React.ReactElement;
  router?: (props: PropsWithChildren) => React.ReactNode;
  waitUntilLoaded?: boolean;
  apis?: ApiOverrides;
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
  apis: ApiClients;
  queryClient: ReturnType<typeof createTestQueryClient>;
  Router?: (props: PropsWithChildren) => React.ReactNode;
}

function DefaultProviders({ children, apis, queryClient, Router = DefaultRouter }: ProvidersProps) {
  return (
    <ApiProvider apis={apis}>
      <AppQueryProvider queryClient={queryClient}>
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
      </AppQueryProvider>
    </ApiProvider>
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

function MinimalProviders({ children, apis, queryClient, Router = DefaultRouter }: ProvidersProps) {
  return (
    <ApiProvider apis={apis}>
      <AppQueryProvider queryClient={queryClient}>
        <Router>
          <CurrentLanguageProvider>
            <NavigationFocusStateProvider>{children}</NavigationFocusStateProvider>
          </CurrentLanguageProvider>
        </Router>
      </AppQueryProvider>
    </ApiProvider>
  );
}

/** Create an isolated app cache and typed API clients for a test render. */
export function setupFakeApp({ apis }: { apis?: ApiOverrides } = {}) {
  return { queryClient: createTestQueryClient(), apis: createApiMocks(apis) };
}

const renderBase = async ({
  renderer,
  router,
  apis = {},
  waitUntilLoaded = true,
  Providers = DefaultProviders,
  initialRenderRef = { current: true },
  ...renderOptions
}: BaseRenderOptions) => {
  const { queryClient, apis: finalApis } = setupFakeApp({ apis });

  if (!router) {
    throw new Error('No router provided');
  }

  const ProviderWrapper = ({ children }: PropsWithChildren) => (
    <Providers
      Router={router}
      queryClient={queryClient}
      apis={finalApis}
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
        for (const [clientName, client] of Object.entries(finalApis)) {
          for (const [methodName, fn] of Object.entries(client)) {
            for (const args of fn.mock.calls) {
              queryCalls.push(`- ${clientName}.${methodName}(${JSON.stringify(args)})`);
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
    apis: finalApis,

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
      apis: {
        ...renderOptions.apis,
        formBootstrapApi: {
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
          ...renderOptions.apis?.formBootstrapApi,
        },
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
    ...args: Parameters<FormBootstrapApi['fetchFormBootstrapForInstance']>
  ): Promise<FormBootstrapResponse> {
    const mock =
      (inInstance ? await rest.apis?.formBootstrapApi?.fetchFormBootstrapForInstance?.(...args) : undefined) ??
      (!inInstance ? await rest.apis?.formBootstrapApi?.fetchFormBootstrapForStateless?.(...args) : undefined) ??
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
    apis: {
      ...rest.apis,
      formBootstrapApi: {
        ...rest.apis?.formBootstrapApi,
        fetchFormBootstrapForInstance: formBootstrap,
        fetchFormBootstrapForStateless: formBootstrap,
      },
    },
  }) as RenderGenericComponentReturnType<InInstance>;
}

const mockGenericComponentProps: IComponentProps = {
  containerDivRef: { current: null },
};
