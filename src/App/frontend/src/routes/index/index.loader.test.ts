import { type LoaderFunctionArgs, redirect, RouterContextProvider } from 'react-router';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getPartyMock } from 'src/__mocks__/getPartyMock';
import { createTestQueryClient } from 'src/core/queries/queryClient';
import { GlobalData } from 'src/GlobalData';
import { appQueriesContext } from 'src/routerContexts/appQueriesRouterContext';
import { queryClientContext } from 'src/routerContexts/reactQueryRouterContext';
import { clientLoader } from 'src/routes/index/index.loader';
import { setupFakeApp } from 'src/test/renderWithProviders';
import { createLoaderFunctionArgs } from 'src/test/routerUtils';

let queries: ReturnType<typeof setupFakeApp>['queries'];
let mutations: ReturnType<typeof setupFakeApp>['mutations'];
beforeEach(() => {
  ({ queries, mutations } = setupFakeApp());
});

vi.mock('react-router', async () => ({
  ...(await vi.importActual('react-router')),
  redirect: vi.fn((url: string) => ({ status: 302, headers: new Map([['Location', url]]) })),
}));

function createLoaderArgs(): LoaderFunctionArgs {
  const queryClient = createTestQueryClient();
  const context = new RouterContextProvider();
  context.set(queryClientContext, queryClient);
  context.set(appQueriesContext, queries);
  return createLoaderFunctionArgs({ context });
}

describe('index clientLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('redirects to instance selection when exactly one active instance exists', async () => {
    const party = getPartyMock();
    GlobalData.setSelectedParty(party);
    window.altinnAppGlobalData.applicationMetadata = getApplicationMetadataMock({
      onEntry: { show: 'select-instance' },
    });
    const activeInstances = [
      {
        id: `${party.partyId}/fc0701bf-8492-475c-adff-93845c6060ab`,
        presentationTexts: null,
        dueBefore: null,
        lastChanged: '2026-09-01T09:30:21.9588629Z',
        lastChangedBy: 'Sophie Salt',
      },
    ];
    vi.mocked(queries.getActiveInstances).mockResolvedValue(activeInstances);

    await clientLoader(createLoaderArgs());

    expect(mutations.createInstance.mock).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith('/instance-selection');
  });
  it('does not create an instance when the service is closed', async () => {
    GlobalData.setSelectedParty(getPartyMock());
    window.altinnAppGlobalData.applicationMetadata = getApplicationMetadataMock({
      onEntry: { show: 'new-instance' },
      validTo: '2020-01-01T00:00:00Z',
    });
    vi.mocked(queries.getActiveInstances).mockResolvedValue([]);

    const result = await clientLoader(createLoaderArgs());

    expect(result).toEqual({ error: 'instantiation-closed', reason: { reason: 'closed' } });
    expect(mutations.createInstance.mock).not.toHaveBeenCalled();
  });

  it('reports a closed service when the backend rejects creation with 410', async () => {
    GlobalData.setSelectedParty(getPartyMock());
    window.altinnAppGlobalData.applicationMetadata = getApplicationMetadataMock({
      onEntry: { show: 'new-instance' },
    });
    vi.mocked(queries.getActiveInstances).mockResolvedValue([]);
    vi.mocked(mutations.createInstance.mock).mockRejectedValue(
      Object.assign(new Error('Gone'), { isAxiosError: true, response: { status: 410 } }),
    );

    const result = await clientLoader(createLoaderArgs());

    expect(result).toEqual({ error: 'instantiation-closed', reason: { reason: 'closed' } });
  });
});
