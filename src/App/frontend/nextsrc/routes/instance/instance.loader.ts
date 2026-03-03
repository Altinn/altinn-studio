import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { InstanceApi } from 'nextsrc/core/api-client/instance.api';
import { routeBuilders } from 'nextsrc/routesBuilder';

export const instanceLoader = async ({
  params,
}: LoaderFunctionArgs<{ instanceOwnerPartyId: string; instanceGuid: string }>) => {
  const { instanceOwnerPartyId, instanceGuid } = params;

  if (!instanceOwnerPartyId || !instanceGuid) {
    throw new Error('Route params missing');
  }

  const instance = await InstanceApi.getInstance({ instanceOwnerPartyId, instanceGuid });

  if (instance.process.ended || !instance.process.currentTask) {
    return redirect(routeBuilders.processEnd({ instanceOwnerPartyId, instanceGuid }));
  }

  const taskId = instance.process.currentTask.elementId;

  return redirect(routeBuilders.task({ instanceGuid, instanceOwnerPartyId, taskId }));
};
