import { redirect, RouterContextProvider } from 'react-router';
import type { Params } from 'react-router';

import { QueryClient } from '@tanstack/react-query';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { getLayoutSettingsMock, getUiConfigMock } from 'src/__mocks__/getUiConfigMock';
import { backendValidationApi } from 'src/core/api-client/backendValidation.api';
import { instanceApi } from 'src/core/api-client/instance.api';
import { partyApi } from 'src/core/api-client/party.api';
import { textResourcesApi } from 'src/core/api-client/textResources.api';
import { apiClientsContext } from 'src/routerContexts/apiClientRouterContext';
import { queryClientContext } from 'src/routerContexts/reactQueryRouterContext';
import { clientLoader as instanceIndexLoader } from 'src/routes/instance/instance-index.route';
import { clientLoader as taskIndexLoader } from 'src/routes/task/task-index.route';
import { createLoaderFunctionArgs } from 'src/test/routerUtils';

// react-router's redirect() requires the Fetch API Response class, which jsdom doesn't provide.
vi.mock('react-router', async () => ({
  ...(await vi.importActual('react-router')),
  redirect: vi.fn((url: string) => ({ status: 302, headers: new Map([['Location', url]]) })),
}));

vi.mock('src/core/api-client/instance.api');

const instanceOwnerPartyId = '512345';
const instanceGuid = '75154373-aed4-41f7-95b4-e5b5115c2edc';

function createLoaderArgs(params: Params) {
  const context = new RouterContextProvider();
  context.set(queryClientContext, new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  context.set(apiClientsContext, { backendValidationApi, instanceApi, partyApi, textResourcesApi });
  return createLoaderFunctionArgs({ context, params, request: new Request('http://localhost/') });
}

describe('instance-index clientLoader', () => {
  it('opens a running service task with a page on its first page', async () => {
    window.altinnAppGlobalData.ui = getUiConfigMock((ui) => {
      ui.folders.Task_Service = getLayoutSettingsMock({ pages: { order: ['page1'] } });
    });
    const instance = getInstanceWithProcessMock();
    instance.process.processTasks = [
      { altinnTaskType: 'data', elementId: 'Task_1', elementType: 'Task' },
      { altinnTaskType: 'scenario', elementId: 'Task_Service', elementType: 'ServiceTask' },
    ];
    instance.process.currentTask = {
      ...instance.process.currentTask!,
      elementId: 'Task_Service',
      name: 'Task_Service',
      altinnTaskType: 'scenario',
      elementType: 'ServiceTask',
    };
    instance.process.workflow = { status: 'processing', targetTask: 'Task_Service' };
    vi.mocked(instanceApi.getInstance).mockResolvedValue(instance);

    await instanceIndexLoader(createLoaderArgs({ instanceOwnerPartyId, instanceGuid }));
    expect(redirect).toHaveBeenLastCalledWith(`/instance/${instanceOwnerPartyId}/${instanceGuid}/Task_Service`);

    await taskIndexLoader(createLoaderArgs({ instanceOwnerPartyId, instanceGuid, taskId: 'Task_Service' }));
    expect(redirect).toHaveBeenLastCalledWith(`/instance/${instanceOwnerPartyId}/${instanceGuid}/Task_Service/page1`);
  });
});
