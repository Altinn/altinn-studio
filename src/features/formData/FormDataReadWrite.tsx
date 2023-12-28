import React from 'react';
import type { PropsWithChildren } from 'react';

import { useQuery } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios/index';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { useIsStatelessApp } from 'src/features/applicationMetadata/appMetadataUtils';
import { useCurrentDataModelUrl } from 'src/features/datamodel/useBindingSchema';
import { useLayoutSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { FormDataReadOnlyProvider } from 'src/features/formData/FormDataReadOnly';
import { FD, FormDataWriteProvider } from 'src/features/formData/FormDataWrite';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { MissingRolesError } from 'src/features/instantiate/containers/MissingRolesError';
import { useCurrentParty } from 'src/features/party/PartiesProvider';
import { isAxiosError } from 'src/utils/isAxiosError';
import { maybeAuthenticationRedirect } from 'src/utils/maybeAuthenticationRedirect';
import { HttpStatusCodes } from 'src/utils/network/networking';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

function useFormDataQuery() {
  const currentPartyId = useCurrentParty()?.partyId;
  const isStateless = useIsStatelessApp();
  const url = useCurrentDataModelUrl();

  // We also add the current task id to the query key, so that the query is refetched when the task changes. This
  // is needed because we have logic waiting for the form data to be fetched before we can continue (even if the
  // data element used is the same one between two different tasks - in which case it could also have been changed
  // on the server).
  const currentTaskId = useLaxProcessData()?.currentTask?.elementId;

  const options: AxiosRequestConfig = {};
  if (isStateless && currentPartyId !== undefined) {
    options.headers = {
      party: `partyid:${currentPartyId}`,
    };
  }

  const enabled = url !== undefined;
  const { fetchFormData } = useAppQueries();
  const utils = useQuery({
    // Form data is only fetched to initially populate the context, after that we keep the state internally
    // and push it back to the server.
    cacheTime: 0,
    retry: false,

    queryKey: ['fetchFormData', url, currentTaskId],
    queryFn: async () => await fetchFormData(url!, options),
    enabled,
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

  return {
    ...utils,
    enabled,
    url,
  };
}

/**
 * This provider loads the initial form data for a data task, and then provides a FormDataWriteProvider with that
 * initial data. When this is provided, you'll have the tools needed to read/write form data.
 */
export function FormDataReadWriteProvider({ children }: PropsWithChildren) {
  const { error, isLoading, data, enabled, url } = useFormDataQuery();
  const autoSaveBehaviour = useLayoutSettings().pages.autoSaveBehavior;

  if (!enabled || !url) {
    throw new Error('FormDataReadWriteProvider cannot be provided without a url');
  }

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

  return (
    <FormDataWriteProvider
      url={url}
      initialData={data}
      autoSaving={!autoSaveBehaviour || autoSaveBehaviour === 'onChangeFormData'}
    >
      <FormDataReadOnlyFromReadWriteProvider>{children}</FormDataReadOnlyFromReadWriteProvider>
    </FormDataWriteProvider>
  );
}

function FormDataReadOnlyFromReadWriteProvider({ children }: PropsWithChildren) {
  const formData = FD.useDebouncedDotMap();
  return <FormDataReadOnlyProvider value={formData}>{children}</FormDataReadOnlyProvider>;
}
