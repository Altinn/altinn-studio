import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import type { QueryClient } from '@tanstack/react-query';

import { parseInstanceId, prefetchActiveInstances } from 'src/core/queries/instance';
import { isInstantiationValidationResult } from 'src/features/instantiate/InstantiationValidation';
import { GlobalData } from 'src/GlobalData';
import { buildInstanceUrl } from 'src/routesBuilder';
import { isAxiosError } from 'src/utils/isAxiosError';
import type { InstanceApi } from 'src/core/api-client/instance.api';
import type { InstantiationValidationResult } from 'src/features/instantiate/InstantiationValidation';

export type IndexLoaderError =
  | { error: 'forbidden' }
  | { error: 'forbidden-validation'; validationResult: InstantiationValidationResult }
  | { error: 'instantiation-failed'; cause: Error };

export type IndexLoaderResult = null | IndexLoaderError;

function isStateless(): boolean {
  const entryType = GlobalData.applicationMetadata.onEntry?.show;
  return entryType !== 'new-instance' && entryType !== 'select-instance';
}

export function indexLoader(queryClient: QueryClient, instanceApi: InstanceApi) {
  return async function loader(_: LoaderFunctionArgs): Promise<IndexLoaderResult | Response> {
    if (isStateless()) {
      return null;
    }

    const entryType = GlobalData.applicationMetadata.onEntry?.show;

    if (!GlobalData.getSelectedParty()) {
      return redirect('/party-selection');
    }

    try {
      if (entryType === 'new-instance') {
        return await createInstanceAndRedirect(instanceApi);
      }

      if (entryType === 'select-instance') {
        return await handleSelectInstance(queryClient, instanceApi);
      }
    } catch (error) {
      return toLoaderError(error);
    }

    throw new Error(`Unexpected entry type: ${entryType}`);
  };
}

async function handleSelectInstance(queryClient: QueryClient, instanceApi: InstanceApi): Promise<Response> {
  const activeInstances = await prefetchActiveInstances(
    queryClient,
    String(GlobalData.getSelectedParty()!.partyId),
    instanceApi,
  );

  if (activeInstances.length === 0) {
    return await createInstanceAndRedirect(instanceApi);
  }

  if (activeInstances.length === 1) {
    const { instanceOwnerPartyId, instanceGuid } = parseInstanceId(activeInstances[0].id);
    return redirect(buildInstanceUrl(instanceOwnerPartyId, instanceGuid));
  }

  return redirect('/instance-selection');
}

async function createInstanceAndRedirect(instanceApi: InstanceApi): Promise<Response> {
  const instance = await instanceApi.create({ instanceOwnerPartyId: GlobalData.getSelectedParty()!.partyId });
  const { instanceOwnerPartyId, instanceGuid } = parseInstanceId(instance.id);
  return redirect(buildInstanceUrl(instanceOwnerPartyId, instanceGuid));
}

function toLoaderError(error: unknown): IndexLoaderError {
  if (isAxiosError(error) && error.response?.status === 403) {
    const data = error.response?.data;
    if (isInstantiationValidationResult(data)) {
      return { error: 'forbidden-validation', validationResult: data };
    }
    return { error: 'forbidden' };
  }

  return { error: 'instantiation-failed', cause: error instanceof Error ? error : new Error(String(error)) };
}
