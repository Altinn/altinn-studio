import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import type { QueryClient } from '@tanstack/react-query';

import { getUiConfig } from 'src/features/form/ui';
import { processQueries } from 'src/features/instance/useProcessQuery';
import { computeStartUrl, getRawFirstPage, getTaskTypeForLoader } from 'src/utils/computeStartUrl';

export function taskIndexLoader(queryClient: QueryClient) {
  return async function loader({ params, request }: LoaderFunctionArgs) {
    const { instanceOwnerPartyId, instanceGuid, taskId } = params;
    if (!instanceOwnerPartyId || !instanceGuid || !taskId) {
      return null;
    }

    const instanceId = `${instanceOwnerPartyId}/${instanceGuid}`;
    const processData = await queryClient.fetchQuery(processQueries.processState(instanceId));
    const uiFolders = getUiConfig().folders;
    const taskType = getTaskTypeForLoader(processData, taskId, false, uiFolders);
    const firstPage = getRawFirstPage(taskId);
    const queryKeys = new URL(request.url).search;

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
