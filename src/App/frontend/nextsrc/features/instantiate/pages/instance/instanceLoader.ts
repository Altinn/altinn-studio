import { redirect } from 'react-router-dom';
import type { LoaderFunctionArgs } from 'react-router-dom';

import { InstanceApi } from 'nextsrc/core/apiClient/instanceApi';
import { routeBuilders } from 'nextsrc/routesBuilder';

export const instanceLoader = async ({
  params,
}: LoaderFunctionArgs<{ instanceOwnerPartyId: string; instanceGuid: string; taskId: string; pageId: string }>) => {
  const { instanceOwnerPartyId, instanceGuid } = params;

  if (!instanceOwnerPartyId || !instanceGuid) {
    throw new Error('Route params missing');
  }

  const instance = await InstanceApi.getInstance({ instanceOwnerPartyId, instanceGuid });

  const taskId = instance.process.currentTask?.elementId;

  if (!taskId) {
    throw new Error('taskId missing');
  }

  return redirect(routeBuilders.task({ instanceGuid, instanceOwnerPartyId, taskId }));
};
