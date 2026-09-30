import { type LoaderFunctionArgs, redirect, RouterContextProvider } from 'react-router';

import { QueryClient } from '@tanstack/react-query';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getPartyMock } from 'src/__mocks__/getPartyMock';
import { backendValidationApi } from 'src/core/api-client/backendValidation.api';
import { instanceApi } from 'src/core/api-client/instance.api';
import { partyApi } from 'src/core/api-client/party.api';
import { textResourcesApi } from 'src/core/api-client/textResources.api';
import { GlobalData } from 'src/GlobalData';
import { apiClientsContext } from 'src/routerContexts/apiClientRouterContext';
import { queryClientContext } from 'src/routerContexts/reactQueryRouterContext';
import { clientLoader } from 'src/routes/index/index.loader';
import { createLoaderFunctionArgs } from 'src/test/routerUtils';

vi.mock('react-router', async () => ({
  ...(await vi.importActual('react-router')),
  redirect: vi.fn((url: string) => ({ status: 302, headers: new Map([['Location', url]]) })),
}));

vi.mock('src/core/api-client/instance.api');

function createLoaderArgs(): LoaderFunctionArgs {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const context = new RouterContextProvider();
  context.set(queryClientContext, queryClient);
  context.set(apiClientsContext, { backendValidationApi, instanceApi, partyApi, textResourcesApi });
  return createLoaderFunctionArgs({ context });
}

describe('index clientLoader', () => {
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
    vi.mocked(instanceApi.getActiveInstances).mockResolvedValue(activeInstances);

    await clientLoader(createLoaderArgs());

    expect(instanceApi.create).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith('/instance-selection');
  });
});
