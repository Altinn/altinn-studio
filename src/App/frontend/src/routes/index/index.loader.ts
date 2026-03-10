import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import type { QueryClient } from '@tanstack/react-query';

import { isInstantiationValidationResult } from 'src/features/instantiate/InstantiationValidation';
import { GlobalData } from 'src/GlobalData';
import { doInstantiate, fetchActiveInstances } from 'src/queries/queries';
import { buildInstanceUrl } from 'src/routesBuilder';
import { isAxiosError } from 'src/utils/isAxiosError';
import type { InstantiationValidationResult } from 'src/features/instantiate/InstantiationValidation';
import type { IInstance } from 'src/types/shared';

export type IndexLoaderError =
  | { error: 'forbidden' }
  | { error: 'forbidden-validation'; validationResult: InstantiationValidationResult }
  | { error: 'unknown' };

export type IndexLoaderResult = null | IndexLoaderError;

function isStateless(): boolean {
  const entryType = GlobalData.applicationMetadata.onEntry?.show;
  return entryType !== 'new-instance' && entryType !== 'select-instance';
}

export function indexLoader(queryClient: QueryClient) {
  return async function loader(_: LoaderFunctionArgs): Promise<IndexLoaderResult | Response> {
    if (isStateless()) {
      return null;
    }

    const entryType = GlobalData.applicationMetadata.onEntry?.show;

    try {
      if (entryType === 'new-instance') {
        return await createInstanceAndRedirect();
      }

      if (entryType === 'select-instance' && GlobalData.selectedParty) {
        return await handleSelectInstance(queryClient);
      }
    } catch (error) {
      return toLoaderError(error);
    }

    throw new Error('Unexpected entry type or missing selected party');
  };
}

async function handleSelectInstance(queryClient: QueryClient): Promise<Response> {
  const activeInstances = await queryClient.ensureQueryData({
    queryKey: ['getActiveInstances', GlobalData.selectedParty!.partyId],
    queryFn: () => fetchActiveInstances(GlobalData.selectedParty!.partyId),
  });

  if (activeInstances.length === 0) {
    return await createInstanceAndRedirect();
  }

  if (activeInstances.length === 1) {
    const [instanceOwnerPartyId, instanceGuid] = activeInstances[0].id.split('/');
    return redirect(buildInstanceUrl(instanceOwnerPartyId, instanceGuid));
  }

  return redirect('/instance-selection');
}

async function createInstanceAndRedirect(): Promise<Response> {
  const instance = await createNewInstance();
  const [instanceOwnerPartyId, instanceGuid] = instance.id.split('/');
  return redirect(buildInstanceUrl(instanceOwnerPartyId, instanceGuid));
}

function toLoaderError(error: unknown): IndexLoaderError {
  if (!isAxiosError(error) || error.response?.status !== 403) {
    return { error: 'unknown' };
  }

  const data = error.response?.data;
  if (isInstantiationValidationResult(data)) {
    return { error: 'forbidden-validation', validationResult: data };
  }

  return { error: 'forbidden' };
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
