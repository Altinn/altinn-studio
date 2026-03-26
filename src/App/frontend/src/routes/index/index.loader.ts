import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import type { QueryClient } from '@tanstack/react-query';

import { InstanceApi } from 'src/core/api-client/instance.api';
import { parseInstanceId, prefetchActiveInstances } from 'src/core/queries/instance';
import { isInstantiationValidationResult } from 'src/features/instantiate/InstantiationValidation';
import { GlobalData } from 'src/GlobalData';
import { buildInstanceUrl } from 'src/routesBuilder';
import { isAxiosError } from 'src/utils/isAxiosError';
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

export function indexLoader(queryClient: QueryClient) {
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
        return await createInstanceAndRedirect();
      }

      if (entryType === 'select-instance') {
        return await handleSelectInstance(queryClient);
      }
    } catch (error) {
      return toLoaderError(error);
    }

    throw new Error(`Unexpected entry type: ${entryType}`);
  };
}

async function handleSelectInstance(queryClient: QueryClient): Promise<Response> {
  const activeInstances = await prefetchActiveInstances(queryClient, String(GlobalData.getSelectedParty()!.partyId));

  if (activeInstances.length === 0) {
    return await createInstanceAndRedirect();
  }

  if (activeInstances.length === 1) {
    const { instanceOwnerPartyId, instanceGuid } = parseInstanceId(activeInstances[0].id);
    return redirect(buildInstanceUrl(instanceOwnerPartyId, instanceGuid));
  }

  return redirect('/instance-selection');
}

async function createInstanceAndRedirect(): Promise<Response> {
  const instance = await InstanceApi.create({ instanceOwnerPartyId: GlobalData.getSelectedParty()!.partyId });
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
