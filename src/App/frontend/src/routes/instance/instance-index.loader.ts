import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import type { QueryClient } from '@tanstack/react-query';

import { getUiConfig } from 'src/features/form/ui';
import { getTargetTaskFromProcess } from 'src/features/instance/useProcessNext';
import { processQueries } from 'src/features/instance/useProcessQuery';
import { computeStartUrl, getRawFirstPage, getTaskTypeForLoader } from 'src/utils/computeStartUrl';

export function instanceIndexLoader(queryClient: QueryClient) {
  return async function loader({ params, request }: LoaderFunctionArgs) {
    const { instanceOwnerPartyId, instanceGuid } = params;
    if (!instanceOwnerPartyId || !instanceGuid) {
      return null;
    }

    const instanceId = `${instanceOwnerPartyId}/${instanceGuid}`;
    const processData = await queryClient.fetchQuery(processQueries.processState(instanceId));
    const forcedTaskId = getTargetTaskFromProcess(processData);
    const uiFolders = getUiConfig().folders;
    const taskType = getTaskTypeForLoader(processData, forcedTaskId, false, uiFolders);
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
  };
}
