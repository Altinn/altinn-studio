import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { fetchFreshInstanceData } from 'src/core/queries/instance';
import { getUiConfig } from 'src/features/form/ui';
import { getTargetTaskFromProcess } from 'src/features/instance/useProcessNext';
import { getTaskTypeById } from 'src/features/instance/useProcessQuery';
import { apiClientsContext } from 'src/routerContexts/apiClientRouterContext';
import { queryClientContext } from 'src/routerContexts/reactQueryRouterContext';
import { computeStartUrl, getRawFirstPage } from 'src/utils/computeStartUrl';

export async function instanceIndexLoader({ context, params, request }: LoaderFunctionArgs) {
  const queryClient = context.get(queryClientContext);
  const { instanceApi } = context.get(apiClientsContext);
  const { instanceOwnerPartyId, instanceGuid } = params;
  if (!instanceOwnerPartyId || !instanceGuid) {
    throw new Error('instance-index loader reached without instanceOwnerPartyId/instanceGuid route params');
  }

  const instance = await fetchFreshInstanceData(queryClient, {
    instanceOwnerPartyId,
    instanceGuid,
    instanceApi,
  });
  const processData = instance?.process;
  const forcedTaskId = getTargetTaskFromProcess(processData);
  const uiFolders = getUiConfig().folders;
  const taskType = getTaskTypeById(processData, forcedTaskId, false, uiFolders);
  const firstPage = getRawFirstPage(forcedTaskId);
  const queryKeys = new URL(request.url).search;

  const startUrl = computeStartUrl({
    instanceOwnerPartyId,
    instanceGuid,
    taskId: forcedTaskId,
    queryKeys,
    firstPage,
    forcedTaskId,
    taskType,
    isStateless: false,
  });

  return redirect(startUrl);
}
