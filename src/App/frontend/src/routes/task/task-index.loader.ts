import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { fetchFreshInstanceData } from 'src/core/queries/instance';
import { getUiConfig } from 'src/features/form/ui';
import { getTaskTypeById } from 'src/features/instance/useProcessQuery';
import { queryClientContext } from 'src/routerContexts/reactQueryRouterContext';
import { ProcessTaskType } from 'src/types';
import { computeStartUrl, getRawFirstPage } from 'src/utils/computeStartUrl';
import type { InstanceApi } from 'src/core/api-client/instance.api';

export function taskIndexLoader(instanceApi: InstanceApi) {
  return async function loader({ context, params, request }: LoaderFunctionArgs) {
    const queryClient = context.get(queryClientContext);
    const { instanceOwnerPartyId, instanceGuid, taskId } = params;
    if (!instanceOwnerPartyId || !instanceGuid || !taskId) {
      throw new Error('task-index loader reached without instanceOwnerPartyId/instanceGuid/taskId route params');
    }

    const instance = await fetchFreshInstanceData(queryClient, {
      instanceOwnerPartyId,
      instanceGuid,
      instanceApi,
    });
    const processData = instance?.process;
    const uiFolders = getUiConfig().folders;
    const taskType = getTaskTypeById(processData, taskId, false, uiFolders);
    const firstPage = getRawFirstPage(taskId);
    const queryKeys = new URL(request.url).search;

    if (taskType !== ProcessTaskType.Data || !firstPage) {
      return null;
    }

    const startUrl = computeStartUrl({
      instanceOwnerPartyId,
      instanceGuid,
      taskId,
      queryKeys,
      firstPage,
      taskType,
      isStateless: false,
    });

    return redirect(startUrl);
  };
}
