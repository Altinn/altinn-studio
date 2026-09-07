import { RouterContextProvider } from 'react-router';

import { QueryClient } from '@tanstack/react-query';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { backendValidationApi } from 'src/core/api-client/backendValidation.api';
import { instanceApi } from 'src/core/api-client/instance.api';
import { partyApi } from 'src/core/api-client/party.api';
import { textResourcesApi } from 'src/core/api-client/textResources.api';
import { apiClientsContext } from 'src/routerContexts/apiClientRouterContext';
import { queryClientContext } from 'src/routerContexts/reactQueryRouterContext';
import { clientLoader } from 'src/routes/task/task-index.route';
import { createLoaderFunctionArgs } from 'src/test/routerUtils';

vi.mock('src/core/api-client/instance.api');

function createArgs(query: string) {
  const context = new RouterContextProvider();
  context.set(queryClientContext, new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  context.set(apiClientsContext, { backendValidationApi, instanceApi, partyApi, textResourcesApi });
  return createLoaderFunctionArgs({
    context,
    params: {
      instanceOwnerPartyId: '512345',
      instanceGuid: '75154373-aed4-41f7-95b4-e5b5115c2edc',
      taskId: 'Task_1',
    },
    request: new Request(
      `https://local.altinn.cloud/ttd/test/instance/512345/75154373-aed4-41f7-95b4-e5b5115c2edc/Task_1?${query}`,
    ),
  });
}

describe('task index PDF routing', () => {
  it('leaves explicit PDF targets at the task entry without loading or redirecting the interactive form', async () => {
    const result = await clientLoader(
      createArgs('pdf=1&pdfUiFolder=subform-layout&pdfDataElementId=aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'),
    );
    expect(result).toBeNull();
    expect(instanceApi.getInstance).not.toHaveBeenCalled();
  });

  it('rejects incomplete context instead of redirecting to the task form', async () => {
    await expect(clientLoader(createArgs('pdf=1&pdfUiFolder=subform-layout'))).rejects.toThrow(
      'Invalid PDF render context',
    );
    expect(instanceApi.getInstance).not.toHaveBeenCalled();
  });

  it('keeps legacy PDF task redirects', async () => {
    vi.mocked(instanceApi.getInstance).mockResolvedValue(getInstanceWithProcessMock());
    const result = await clientLoader(createArgs('pdf=1'));
    expect(result?.status).toBe(302);
    expect(result?.headers.get('Location')).toContain('/Task_1/');
  });
});
