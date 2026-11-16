import { LoaderFunctionArgs, redirect, RouterContextProvider } from 'react-router';

import { HttpError } from '@studio/http-client';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getPartyMock } from 'src/__mocks__/getPartyMock';
import { getProcessDataMock } from 'src/__mocks__/getProcessDataMock';
import { createTestQueryClient } from 'src/core/queries/queryClient';
import { GlobalData } from 'src/GlobalData';
import { appQueriesContext } from 'src/routerContexts/appQueriesRouterContext';
import { queryClientContext } from 'src/routerContexts/reactQueryRouterContext';
import { clientLoader } from 'src/routes/instance-selection/instance-selection.loader';
import { setupFakeApp } from 'src/test/renderWithProviders';
import { createLoaderFunctionArgs } from 'src/test/routerUtils';
import type { InstanceSelectionLoaderResult } from 'src/routes/instance-selection/instance-selection.loader';

let queries: ReturnType<typeof setupFakeApp>['queries'];
let mutations: ReturnType<typeof setupFakeApp>['mutations'];
beforeEach(() => {
  ({ queries, mutations } = setupFakeApp());
});

// react-router's redirect() requires the Fetch API Response class, which jsdom doesn't provide.
// We mock it to return a plain object with the same shape.
vi.mock('react-router', async () => ({
  ...(await vi.importActual('react-router')),
  redirect: vi.fn((url: string, init?: number | ResponseInit) => {
    const status = typeof init === 'number' ? init : (init?.status ?? 302);
    return { status, headers: new Map([['Location', url]]) };
  }),
}));

const mockParty = getPartyMock();
const mockInstance = {
  ...getInstanceDataMock(),
  id: `${mockParty.partyId}/some-instance-guid`,
  process: getProcessDataMock(),
};

function createLoaderArgs(): LoaderFunctionArgs {
  const queryClient = createTestQueryClient();
  const context = new RouterContextProvider();
  context.set(queryClientContext, queryClient);
  context.set(appQueriesContext, queries);
  return createLoaderFunctionArgs({ context });
}

describe('instance-selection clientLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.altinnAppGlobalData.applicationMetadata = getApplicationMetadataMock();
    GlobalData.setSelectedParty(mockParty);
  });

  afterEach(() => {
    GlobalData.setSelectedParty(undefined);
  });

  it('should return null when active instances exist (let component render table)', async () => {
    const activeInstances = [
      { id: '12345/guid-1', lastChanged: '2021-10-05T07:51:57Z', lastChangedBy: 'Test User' },
      { id: '12345/guid-2', lastChanged: '2021-05-13T07:51:57Z', lastChangedBy: 'Other User' },
    ];
    vi.mocked(queries.getActiveInstances).mockResolvedValue(activeInstances);

    const result = await clientLoader(createLoaderArgs());

    expect(result).toBeNull();
    expect(mutations.createInstance.mock).not.toHaveBeenCalled();
  });

  it('should create instance and redirect when no active instances exist', async () => {
    vi.mocked(queries.getActiveInstances).mockResolvedValue([]);
    vi.mocked(mutations.createInstance.mock).mockResolvedValue(mockInstance);

    await clientLoader(createLoaderArgs());

    expect(mutations.createInstance.mock).toHaveBeenCalledWith({ instanceOwnerPartyId: mockParty.partyId });
    expect(redirect).toHaveBeenCalledWith(expect.stringContaining('some-instance-guid'));
  });

  it('should return forbidden-validation error when instantiation fails with 403 and validation result', async () => {
    const validationResult = {
      valid: false,
      validParties: [],
      message: 'Not allowed',
    };
    const error = new HttpError({ status: 403, data: validationResult }, 'Forbidden');

    vi.mocked(queries.getActiveInstances).mockResolvedValue([]);
    vi.mocked(mutations.createInstance.mock).mockRejectedValue(error);

    const result = (await clientLoader(createLoaderArgs())) as InstanceSelectionLoaderResult;

    expect(result).not.toBeNull();
    expect(result).toHaveProperty('error', 'forbidden-validation');
    if (result && 'validationResult' in result) {
      expect(result.validationResult).toEqual(validationResult);
    }
  });

  it('should return forbidden error when instantiation fails with 403 without validation', async () => {
    const error = new HttpError({ status: 403, data: {} }, 'Forbidden');

    vi.mocked(queries.getActiveInstances).mockResolvedValue([]);
    vi.mocked(mutations.createInstance.mock).mockRejectedValue(error);

    const result = await clientLoader(createLoaderArgs());

    expect(result).not.toBeNull();
    expect(result).toHaveProperty('error', 'forbidden');
  });

  it('should return instantiation-failed error when instantiation fails with non-403 error', async () => {
    const error = new Error('Server error');

    vi.mocked(queries.getActiveInstances).mockResolvedValue([]);
    vi.mocked(mutations.createInstance.mock).mockRejectedValue(error);

    const result = await clientLoader(createLoaderArgs());

    expect(result).not.toBeNull();
    expect(result).toHaveProperty('error', 'instantiation-failed');
    if (result && 'cause' in result) {
      expect(result.cause).toBe(error);
    }
  });

  it('should redirect to party-selection when no party is selected', async () => {
    GlobalData.setSelectedParty(undefined);
    const originalSelectedParty = window.altinnAppGlobalData.selectedParty;
    window.altinnAppGlobalData.selectedParty = undefined;

    await clientLoader(createLoaderArgs());

    window.altinnAppGlobalData.selectedParty = originalSelectedParty;

    expect(redirect).toHaveBeenCalledWith('/party-selection');
    expect(queries.getActiveInstances).not.toHaveBeenCalled();
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
    vi.mocked(mutations.createInstance.mock).mockRejectedValue(new HttpError({ status: 410, data: undefined }, 'Gone'));

    const result = await clientLoader(createLoaderArgs());

    expect(result).toEqual({ error: 'instantiation-closed', reason: { reason: 'closed' } });
  });
});
