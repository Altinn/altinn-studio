import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import type { QueryClient } from '@tanstack/react-query';

import { getUiConfig } from 'src/features/form/ui';
import { getTaskTypeById, processQueries } from 'src/features/instance/useProcessQuery';
import { ProcessTaskType } from 'src/types';
import { computeStartUrl, getRawFirstPage } from 'src/utils/computeStartUrl';

export function taskIndexLoader(queryClient: QueryClient) {
  return async function loader({ params, request }: LoaderFunctionArgs) {
    const { instanceOwnerPartyId, instanceGuid, taskId } = params;
    if (!instanceOwnerPartyId || !instanceGuid || !taskId) {
      throw new Error('task-index loader reached without instanceOwnerPartyId/instanceGuid/taskId route params');
    }

    const instanceId = `${instanceOwnerPartyId}/${instanceGuid}`;
    const processData = await queryClient.fetchQuery(processQueries.processState(instanceId));
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
