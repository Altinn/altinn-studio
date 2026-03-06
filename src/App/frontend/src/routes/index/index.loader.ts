import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { isAxiosError } from 'src/utils/isAxiosError';
import { GlobalData } from 'src/GlobalData';
import { doInstantiate, fetchActiveInstances } from 'src/queries/queries';
import { buildInstanceUrl, buildPartySelectionUrl } from 'src/routesBuilder';
import type { QueryClient } from '@tanstack/react-query';
import type { IInstance } from 'src/types/shared';

function isStateless() {
  const entryType = GlobalData.applicationMetadata.onEntry?.show;
  return entryType !== 'new-instance' && entryType !== 'select-instance';
}

export function indexLoader(queryClient: QueryClient) {
  return async function loader(_: LoaderFunctionArgs) {
    if (isStateless()) {
      return null;
    }

    const entryType = GlobalData.applicationMetadata.onEntry?.show;

    if (entryType === 'new-instance') {
      const instance = await createNewInstanceOrRedirect();
      if (instance instanceof Response) {
        return instance;
      }
      const [instanceOwnerPartyId, instanceGuid] = instance.id.split('/');
      return redirect(buildInstanceUrl(instanceOwnerPartyId, instanceGuid));
    }

    if (entryType === 'select-instance' && GlobalData.selectedParty) {
      const activeInstances = await queryClient.ensureQueryData({
        queryKey: ['getActiveInstances', GlobalData.selectedParty.partyId],
        queryFn: () => fetchActiveInstances(GlobalData.selectedParty!.partyId),
      });

      if (activeInstances.length === 0) {
        const instance = await createNewInstanceOrRedirect();
        if (instance instanceof Response) {
          return instance;
        }
        const [instanceOwnerPartyId, instanceGuid] = instance.id.split('/');
        return redirect(buildInstanceUrl(instanceOwnerPartyId, instanceGuid));
      }

      if (activeInstances.length === 1) {
        const [instanceOwnerPartyId, instanceGuid] = activeInstances[0].id.split('/');
        return redirect(buildInstanceUrl(instanceOwnerPartyId, instanceGuid));
      }

      return redirect('/instance-selection');
    }

    throw new Error('Unexpected entry type or missing selected party');
  };
}

async function createNewInstanceOrRedirect(): Promise<IInstance | Response> {
  try {
    return await createNewInstance();
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 403) {
      return redirect(`${buildPartySelectionUrl()}?errorCode=403`);
    }
    throw error;
  }
}

async function createNewInstance(): Promise<IInstance> {
  const party = GlobalData.selectedParty;

  const currentPartyIdFromCookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith('AltinnPartyId='))
    ?.split('=')[1];

  const currentPartyId = currentPartyIdFromCookie ?? party?.partyId;
  if (!currentPartyId) {
    throw new Response('User profile not available', { status: 401 });
  }
  return await doInstantiate(Number.parseInt(`${currentPartyId}`));
}