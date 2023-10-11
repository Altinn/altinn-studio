import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';

import { useAppQueries } from 'src/contexts/appQueriesContext';
import { StatelessReadyState, useStatelessReadyState } from 'src/features/entrypoint/useStatelessReadyState';
import { FormDataActions } from 'src/features/formData/formDataSlice';
import { QueueActions } from 'src/features/queue/queueSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useRealTaskType } from 'src/hooks/useProcess';
import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import { ProcessTaskType } from 'src/types';
import { getCurrentTaskDataElementId, getDataTypeByLayoutSetId, isStatelessApp } from 'src/utils/appMetadata';
import { convertModelToDataBinding } from 'src/utils/databindings';
import { putWithoutConfig } from 'src/utils/network/networking';
import {
  getFetchFormDataUrl,
  getStatelessFormDataUrl,
  invalidateCookieUrl,
  redirectToUpgrade,
} from 'src/utils/urls/appUrlHelper';
import type { IFormData } from 'src/features/formData';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

export function useFormDataQuery(): UseQueryResult<IFormData> {
  const dispatch = useAppDispatch();
  const reFetchActive = useAppSelector((state) => state.formData.reFetch);
  const appMetaData = useAppSelector((state) => state.applicationMetadata.applicationMetadata);
  const currentPartyId = useAppSelector((state) => state.party.selectedParty?.partyId);
  const taskType = useRealTaskType();
  const statelessReady = useStatelessReadyState();
  const allowAnonymousSelector = makeGetAllowAnonymousSelector();
  const allowAnonymous = useAppSelector(allowAnonymousSelector);
  const isStateless = isStatelessApp(appMetaData);

  let isEnabled = isStateless
    ? statelessReady === StatelessReadyState.Loading || statelessReady === StatelessReadyState.Ready
    : taskType === ProcessTaskType.Data;
  if (isStateless && !allowAnonymous && currentPartyId === undefined) {
    isEnabled = false;
  }

  const instance = useAppSelector((state) => state.instanceData.instance);
  const layoutSets = useAppSelector((state) => state.formLayout.layoutsets);
  const statelessDataType = isStateless
    ? getDataTypeByLayoutSetId(appMetaData?.onEntry?.show, layoutSets, appMetaData)
    : undefined;
  const currentTaskDataId = getCurrentTaskDataElementId(appMetaData, instance, layoutSets);

  const url =
    isStateless && statelessDataType
      ? getStatelessFormDataUrl(statelessDataType, allowAnonymous)
      : instance && currentTaskDataId
      ? getFetchFormDataUrl(instance.id, currentTaskDataId)
      : undefined;

  const options: AxiosRequestConfig = {};
  if (isStateless && !allowAnonymous && currentPartyId) {
    options.headers = {
      party: `partyid:${currentPartyId}`,
    };
  }

  // We also add the current task id to the query key, so that the query is refetched when the task changes. This
  // is needed because we have logic waiting for the form data to be fetched before we can continue (even if the
  // data element used is the same one between two different tasks - in which case it could also have been changed
  // on the server).
  const currentTaskId = instance?.process?.currentTask?.elementId;

  const { fetchFormData } = useAppQueries();
  const out = useQuery(['fetchFormData', url, currentTaskId], () => fetchFormData(url || '', options), {
    enabled: isEnabled && url !== undefined,
    onSuccess: (formDataAsObj) => {
      const formData = convertModelToDataBinding(formDataAsObj);
      dispatch(FormDataActions.fetchFulfilled({ formData }));
    },
    onError: async (error: HttpClientError) => {
      dispatch(FormDataActions.fetchRejected({ error }));
      dispatch(QueueActions.dataTaskQueueError({ error }));
      if (error.message?.includes('403')) {
        window.logInfo('Current party is missing roles');
      } else {
        window.logError('Fetching form data failed:\n', error);
      }

      if (isStateless && error?.response?.status === 403 && error.response.data) {
        const reqAuthLevel = (error.response.data as any).RequiredAuthenticationLevel;
        if (reqAuthLevel) {
          await putWithoutConfig(invalidateCookieUrl);
          redirectToUpgrade(reqAuthLevel);
        } else {
          throw error;
        }
      }
    },
  });

  if (reFetchActive && !out.isFetching) {
    out.refetch();
  }

  return out;
}
