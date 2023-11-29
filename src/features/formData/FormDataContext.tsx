import React from 'react';

import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import type { AxiosRequestConfig } from 'axios/index';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { createContext } from 'src/core/contexts/context';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { getDataTypeByLayoutSetId, isStatelessApp } from 'src/features/applicationMetadata/appMetadataUtils';
import { useCurrentDataModelGuid } from 'src/features/datamodel/useBindingSchema';
import { useLayoutSets } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { FormDataActions } from 'src/features/formData/formDataSlice';
import { useLaxInstanceData } from 'src/features/instance/InstanceContext';
import { useLaxProcessData, useRealTaskType } from 'src/features/instance/ProcessContext';
import { MissingRolesError } from 'src/features/instantiate/containers/MissingRolesError';
import { useCurrentParty } from 'src/features/party/PartiesProvider';
import { useAllowAnonymous } from 'src/features/stateless/getAllowAnonymous';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { ProcessTaskType } from 'src/types';
import { flattenObject } from 'src/utils/databindings';
import { maybeAuthenticationRedirect } from 'src/utils/maybeAuthenticationRedirect';
import { HttpStatusCodes } from 'src/utils/network/networking';
import { getFetchFormDataUrl, getStatelessFormDataUrl } from 'src/utils/urls/appUrlHelper';
import type { IFormData } from 'src/features/formData/index';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

const { Provider } = createContext({
  name: 'FormDataContext',
  required: false,
  default: undefined,
});

export const FormDataProvider = ({ children }) => {
  const taskType = useRealTaskType();
  const isDataTask = taskType === ProcessTaskType.Data;
  const isInfoTask =
    taskType === ProcessTaskType.Confirm ||
    taskType === ProcessTaskType.Feedback ||
    taskType === ProcessTaskType.Archived;

  const queryFormData = useFormDataQuery(isDataTask);
  const queryInfoFormData = useInfoFormDataQuery(isInfoTask);
  const { error, isLoading } = isDataTask
    ? queryFormData
    : isInfoTask
      ? queryInfoFormData
      : { error: undefined, isLoading: false };

  if (error) {
    // Error trying to fetch data, if missing rights we display relevant page
    if (isAxiosError(error) && error.response?.status === HttpStatusCodes.Forbidden) {
      return <MissingRolesError />;
    }

    return <DisplayError error={error} />;
  }

  if (isLoading) {
    return <Loader reason='formdata' />;
  }

  return <Provider value={undefined}>{children}</Provider>;
};

function useFormDataQuery(enabled: boolean) {
  const dispatch = useAppDispatch();
  const reFetchActive = useAppSelector((state) => state.formData.reFetch);
  const appMetaData = useApplicationMetadata();
  const currentPartyId = useCurrentParty()?.partyId;
  const taskType = useRealTaskType();
  const allowAnonymous = useAllowAnonymous();
  const isStateless = isStatelessApp(appMetaData);

  // We also add the current task id to the query key, so that the query is refetched when the task changes. This
  // is needed because we have logic waiting for the form data to be fetched before we can continue (even if the
  // data element used is the same one between two different tasks - in which case it could also have been changed
  // on the server).
  const currentTaskId = useLaxProcessData()?.currentTask?.elementId;
  const currentTaskDataId = useCurrentDataModelGuid();

  let isEnabled = isStateless ? true : taskType === ProcessTaskType.Data;
  if (isStateless && !allowAnonymous && currentPartyId === undefined) {
    isEnabled = false;
  }
  if (!enabled) {
    isEnabled = false;
  }

  const instance = useLaxInstanceData();
  const layoutSets = useLayoutSets();
  const statelessDataType = isStateless
    ? getDataTypeByLayoutSetId({
        layoutSetId: appMetaData?.onEntry?.show,
        layoutSets,
        appMetaData,
      })
    : undefined;

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

  const { fetchFormData } = useAppQueries();
  const out = useQuery({
    queryKey: ['fetchFormData', url, currentTaskId],
    queryFn: async () => flattenObject(await fetchFormData(url!, options)),
    enabled: isEnabled && url !== undefined,
    onSuccess: (formData) => {
      dispatch(FormDataActions.fetchFulfilled({ formData }));
    },
    onError: async (error: HttpClientError) => {
      if (error.message?.includes('403')) {
        // This renders the <MissingRolesError /> component in the provider
        window.logInfo('Current party is missing roles');
      } else {
        window.logError('Fetching form data failed:\n', error);
      }

      const wasRedirected = await maybeAuthenticationRedirect(error);
      if (!wasRedirected) {
        throw error;
      }
    },
  });

  if (reFetchActive && !out.isFetching) {
    out.refetch().then();
  }

  return out;
}

function useInfoFormDataQuery(enabled: boolean) {
  const { fetchFormData } = useAppQueries();
  const appMetadata = useAppSelector((state) => state.applicationMetadata.applicationMetadata);
  const textResources = useAppSelector((state) => state.textResources.resourceMap);
  const instance = useLaxInstanceData();
  const dispatch = useAppDispatch();

  const urlsToFetch: string[] = [];
  for (const resource of Object.values(textResources)) {
    for (const variable of resource?.variables || []) {
      const modelName = variable.dataSource.replace('dataModel.', '');
      const dataType = appMetadata?.dataTypes.find((d) => d.id === modelName);
      if (!dataType) {
        continue;
      }

      const dataElement = instance?.data.find((e) => e.dataType === dataType.id);
      if (!dataElement) {
        continue;
      }
      urlsToFetch.push(getFetchFormDataUrl(instance?.id || '', dataElement.id));
    }
  }

  return useQuery<IFormData, HttpClientError>({
    queryKey: ['fetchFormData', urlsToFetch],
    queryFn: async () => {
      const out: IFormData = {};
      const promises = urlsToFetch.map((url) => fetchFormData(url));
      const fetched = await Promise.all(promises);
      for (const fetchedData of fetched) {
        const formData = flattenObject(fetchedData);
        for (const [key, value] of Object.entries(formData)) {
          out[key] = value;
        }
      }
      return out;
    },
    enabled,
    onSuccess: (formDataAsObj) => {
      const formData = flattenObject(formDataAsObj);
      dispatch(FormDataActions.fetchFulfilled({ formData }));
    },
  });
}
