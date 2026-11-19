import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { isHttpError } from '@studio/http-client';

import { parseInstanceId, prefetchActiveInstances } from 'src/core/queries/instance';
import { getInstantiationClosedReason, isInstantiationClosedError } from 'src/features/instantiate/instantiationClosed';
import { isInstantiationValidationResult } from 'src/features/instantiate/InstantiationValidation';
import { GlobalData } from 'src/GlobalData';
import { appQueriesContext } from 'src/routerContexts/appQueriesRouterContext';
import { queryClientContext } from 'src/routerContexts/reactQueryRouterContext';
import { isStateless } from 'src/routes/index/isStateless';
import { buildInstanceUrl, buildPartySelectionUrl } from 'src/routesBuilder';
import type { AppQueryClient } from 'src/core/queries/queryClient';
import type { AppQueriesContext } from 'src/core/queries/types';
import type { InstantiationClosedReason } from 'src/features/instantiate/instantiationClosed';
import type { InstantiationValidationResult } from 'src/features/instantiate/InstantiationValidation';

export type IndexLoaderError =
  | { error: 'instantiation-closed'; reason: InstantiationClosedReason }
  | { error: 'forbidden' }
  | { error: 'forbidden-validation'; validationResult: InstantiationValidationResult }
  | { error: 'instantiation-failed'; cause: Error };

export type IndexLoaderResult = null | IndexLoaderError;

export async function clientLoader({ context }: LoaderFunctionArgs): Promise<IndexLoaderResult | Response> {
  const queryClient = context.get(queryClientContext);
  const instanceApi = context.get(appQueriesContext);
  if (isStateless()) {
    // redirect is handled by routes/index/stateless-index.route.tsx
    return null;
  }

  const entryType = GlobalData.applicationMetadata.onEntry?.show;

  if (!GlobalData.getSelectedParty()) {
    return redirect(buildPartySelectionUrl());
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
}

async function handleSelectInstance(
  queryClient: AppQueryClient,
  instanceApi: AppQueriesContext,
): Promise<Response | IndexLoaderError> {
  const activeInstances = await prefetchActiveInstances(
    queryClient,
    String(GlobalData.getSelectedParty()!.partyId),
    instanceApi,
  );

  if (activeInstances.length === 0) {
    return await createInstanceAndRedirect(instanceApi);
  }

  return redirect('/instance-selection');
}

async function createInstanceAndRedirect(instanceApi: AppQueriesContext): Promise<Response | IndexLoaderError> {
  const reason = getInstantiationClosedReason(GlobalData.applicationMetadata, new Date(), window.location.host);
  if (reason) {
    return { error: 'instantiation-closed', reason };
  }
  const instance = await instanceApi.createInstance({ instanceOwnerPartyId: GlobalData.getSelectedParty()!.partyId });
  const { instanceOwnerPartyId, instanceGuid } = parseInstanceId(instance.id);
  return redirect(buildInstanceUrl(instanceOwnerPartyId, instanceGuid));
}

function toLoaderError(error: unknown): IndexLoaderError {
  if (isInstantiationClosedError(error)) {
    return {
      error: 'instantiation-closed',
      reason: getInstantiationClosedReason(GlobalData.applicationMetadata, new Date(), window.location.host) ?? {
        reason: 'closed',
      },
    };
  }
  if (isHttpError(error) && error.response?.status === 403) {
    const data = error.response?.data;
    if (isInstantiationValidationResult(data)) {
      return { error: 'forbidden-validation', validationResult: data };
    }
    return { error: 'forbidden' };
  }

  return { error: 'instantiation-failed', cause: error instanceof Error ? error : new Error(String(error)) };
}
