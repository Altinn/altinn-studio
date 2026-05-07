import { redirect, RouterContextProvider } from 'react-router';

import { QueryClient } from '@tanstack/react-query';

import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getPartyMock } from 'src/__mocks__/getPartyMock';
import { getProcessDataMock } from 'src/__mocks__/getProcessDataMock';
import { instanceApi } from 'src/core/api-client/instance.api';
import { partyApi } from 'src/core/api-client/party.api';
import { GlobalData } from 'src/GlobalData';
import { queryClientContext } from 'src/routerContexts/reactQueryRouterContext';
import { instanceSelectionLoader } from 'src/routes/instance-selection/instance-selection.loader';
import { createLoaderArgs } from 'src/test/routerUtils';
import type { InstanceSelectionLoaderResult } from 'src/routes/instance-selection/instance-selection.loader';

// react-router's redirect() requires the Fetch API Response class, which jsdom doesn't provide.
// We mock it to return a plain object with the same shape.
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  redirect: jest.fn((url: string, init?: number | ResponseInit) => {
    const status = typeof init === 'number' ? init : (init?.status ?? 302);
    return { status, headers: new Map([['Location', url]]) };
  }),
}));

jest.mock('src/core/api-client/instance.api');
jest.mock('src/core/api-client/party.api');

const mockParty = getPartyMock();
const mockInstance = {
  ...getInstanceDataMock(),
  id: `${mockParty.partyId}/some-instance-guid`,
  process: getProcessDataMock(),
};

function createLoader() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const loader = instanceSelectionLoader(partyApi, instanceApi);
  const context = new RouterContextProvider();
  context.set(queryClientContext, queryClient);
  return {
    loader,
    loaderArgs: createLoaderArgs({ context }),
  };
}

describe('instanceSelectionLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    jest.mocked(instanceApi.getActiveInstances).mockResolvedValue(activeInstances);

    const { loader, loaderArgs } = createLoader();
    const result = await loader(loaderArgs);

    expect(result).toBeNull();
    expect(instanceApi.create).not.toHaveBeenCalled();
  });

  it('should create instance and redirect when no active instances exist', async () => {
    jest.mocked(instanceApi.getActiveInstances).mockResolvedValue([]);
    jest.mocked(instanceApi.create).mockResolvedValue(mockInstance);

    const { loader, loaderArgs } = createLoader();
    await loader(loaderArgs);

    expect(instanceApi.create).toHaveBeenCalledWith({ instanceOwnerPartyId: mockParty.partyId });
    expect(redirect).toHaveBeenCalledWith(expect.stringContaining('some-instance-guid'));
  });

  it('should return forbidden-validation error when instantiation fails with 403 and validation result', async () => {
    const validationResult = {
      valid: false,
      validParties: [],
      message: 'Not allowed',
    };
    const error = Object.assign(new Error('Forbidden'), {
      isAxiosError: true,
      response: { status: 403, data: validationResult },
    });

    jest.mocked(instanceApi.getActiveInstances).mockResolvedValue([]);
    jest.mocked(instanceApi.create).mockRejectedValue(error);

    const { loader, loaderArgs } = createLoader();
    const result = (await loader(loaderArgs)) as InstanceSelectionLoaderResult;

    expect(result).not.toBeNull();
    expect(result).toHaveProperty('error', 'forbidden-validation');
    if (result && 'validationResult' in result) {
      expect(result.validationResult).toEqual(validationResult);
    }
  });

  it('should return forbidden error when instantiation fails with 403 without validation', async () => {
    const error = Object.assign(new Error('Forbidden'), {
      isAxiosError: true,
      response: { status: 403, data: {} },
    });

    jest.mocked(instanceApi.getActiveInstances).mockResolvedValue([]);
    jest.mocked(instanceApi.create).mockRejectedValue(error);

    const { loader, loaderArgs } = createLoader();
    const result = await loader(loaderArgs);

    expect(result).not.toBeNull();
    expect(result).toHaveProperty('error', 'forbidden');
  });

  it('should return instantiation-failed error when instantiation fails with non-403 error', async () => {
    const error = new Error('Server error');

    jest.mocked(instanceApi.getActiveInstances).mockResolvedValue([]);
    jest.mocked(instanceApi.create).mockRejectedValue(error);

    const { loader, loaderArgs } = createLoader();
    const result = await loader(loaderArgs);

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

    const { loader, loaderArgs } = createLoader();
    await loader(loaderArgs);

    window.altinnAppGlobalData.selectedParty = originalSelectedParty;

    expect(redirect).toHaveBeenCalledWith('/party-selection');
    expect(instanceApi.getActiveInstances).not.toHaveBeenCalled();
  });
});
