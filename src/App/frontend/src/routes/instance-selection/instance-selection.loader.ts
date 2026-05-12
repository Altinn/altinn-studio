import { type LoaderFunctionArgs, redirect } from 'react-router';

import { parseInstanceId, prefetchActiveInstances } from 'src/core/queries/instance';
import { prefetchPartiesAllowedToInstantiate } from 'src/core/queries/party';
import { isInstantiationValidationResult } from 'src/features/instantiate/InstantiationValidation';
import { GlobalData } from 'src/GlobalData';
import { queryClientContext } from 'src/routerContexts/reactQueryRouterContext';
import { buildInstanceUrl } from 'src/routesBuilder';
import { isAxiosError } from 'src/utils/isAxiosError';
import type { InstanceApi } from 'src/core/api-client/instance.api';
import type { PartyApi } from 'src/core/api-client/party.api';
import type { InstantiationValidationResult } from 'src/features/instantiate/InstantiationValidation';

export type InstanceSelectionLoaderError =
  | { error: 'forbidden' }
  | { error: 'forbidden-validation'; validationResult: InstantiationValidationResult }
  | { error: 'instantiation-failed'; cause: Error };

export type InstanceSelectionLoaderResult = null | InstanceSelectionLoaderError;

export function instanceSelectionLoader(partyApi: PartyApi, instanceApi: InstanceApi) {
  return async function loader({ context }: LoaderFunctionArgs): Promise<InstanceSelectionLoaderResult | Response> {
    const queryClient = context.get(queryClientContext);
    prefetchPartiesAllowedToInstantiate({ queryClient, partyApi });

    const party = GlobalData.getSelectedParty();
    if (!party) {
      return redirect('/party-selection');
    }

    try {
      const activeInstances = await prefetchActiveInstances(queryClient, String(party.partyId), instanceApi);

      if (activeInstances.length === 0) {
        const instance = await instanceApi.create({ instanceOwnerPartyId: party.partyId });
        const { instanceOwnerPartyId, instanceGuid } = parseInstanceId(instance.id);
        return redirect(buildInstanceUrl(instanceOwnerPartyId, instanceGuid));
      }
    } catch (error) {
      return toLoaderError(error);
    }

    return null;
  };
}

function toLoaderError(error: unknown): InstanceSelectionLoaderError {
  if (isAxiosError(error) && error.response?.status === 403) {
    const data = error.response?.data;
    if (isInstantiationValidationResult(data)) {
      return { error: 'forbidden-validation', validationResult: data };
    }
    return { error: 'forbidden' };
  }

  return { error: 'instantiation-failed', cause: error instanceof Error ? error : new Error(String(error)) };
}
