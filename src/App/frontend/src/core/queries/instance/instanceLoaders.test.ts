import { redirect, RouterContextProvider } from 'react-router';
import type { Params } from 'react-router';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { getLayoutSettingsMock, getUiConfigMock } from 'src/__mocks__/getUiConfigMock';
import { instanceDataQuery } from 'src/core/queries/instance/instance.queries';
import { createTestQueryClient } from 'src/core/queries/queryClient';
import { getQueryClient } from 'src/core/queries/queryClient.queries';
import { apiClientsContext } from 'src/routerContexts/apiClientRouterContext';
import { queryClientContext } from 'src/routerContexts/reactQueryRouterContext';
import { clientLoader as instanceIndexLoader } from 'src/routes/instance/instance-index.route';
import { clientLoader as taskIndexLoader } from 'src/routes/task/task-index.route';
import { createApiMocks } from 'src/test/apiMocks';
import { createLoaderFunctionArgs } from 'src/test/routerUtils';

// react-router's redirect() requires the Fetch API Response class, which jsdom doesn't provide.
vi.mock('react-router', async () => ({
  ...(await vi.importActual('react-router')),
  redirect: vi.fn((url: string) => ({ status: 302, headers: new Map([['Location', url]]) })),
}));

let apis: ReturnType<typeof createApiMocks>;
beforeEach(() => {
  apis = createApiMocks();
});

const instanceOwnerPartyId = '512345';
const instanceGuid = '75154373-aed4-41f7-95b4-e5b5115c2edc';

function createLoaderArgs(params: Params) {
  const context = new RouterContextProvider();
  context.set(queryClientContext, createTestQueryClient());
  context.set(apiClientsContext, apis);
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
    vi.mocked(apis.instanceApi.getInstance).mockResolvedValue(instance);

    await instanceIndexLoader(createLoaderArgs({ instanceOwnerPartyId, instanceGuid }));
    expect(redirect).toHaveBeenLastCalledWith(`/instance/${instanceOwnerPartyId}/${instanceGuid}/Task_Service`);

    await taskIndexLoader(createLoaderArgs({ instanceOwnerPartyId, instanceGuid, taskId: 'Task_Service' }));
    expect(redirect).toHaveBeenLastCalledWith(`/instance/${instanceOwnerPartyId}/${instanceGuid}/Task_Service/page1`);
  });

  it("redirects when a refetch cancels the read it joined, as the instance poll's next tick does", async () => {
    window.altinnAppGlobalData.ui = getUiConfigMock();
    const instance = getInstanceWithProcessMock();
    vi.mocked(apis.instanceApi.getInstance).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(instance), 10)),
    );
    const args = createLoaderArgs({ instanceOwnerPartyId, instanceGuid, taskId: 'Task_1' });
    const queryClient = getQueryClient(args.context.get(queryClientContext));
    const { queryKey } = instanceDataQuery({ instanceOwnerPartyId, instanceGuid, instanceApi: apis.instanceApi });
    queryClient.setQueryData(queryKey, instance);

    // A poll's read is in flight when the loader starts, so the loader joins it
    const firstPoll = queryClient.refetchQueries({ queryKey });
    const loading = taskIndexLoader(args);
    // The next poll cancels that read for a newer one
    const nextPoll = queryClient.refetchQueries({ queryKey });

    await loading;
    await Promise.all([firstPoll, nextPoll]);
    expect(redirect).toHaveBeenLastCalledWith(`/instance/${instanceOwnerPartyId}/${instanceGuid}/Task_1/page1`);
  });
});
