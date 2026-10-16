import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useFormDataQueryDef } from 'src/core/queries/formData/formData.queries';
import { useFormDataSaveMutation, useIsSavingFormData, useIsSavingFormDataNow } from 'src/core/queries/formData/save';
import { isAxiosError } from 'src/utils/isAxiosError';
import { maybeAuthenticationRedirect } from 'src/utils/maybeAuthenticationRedirect';

export function useFormDataQuery(url: string | undefined) {
  const def = useFormDataQueryDef(url);
  const utils = useQuery(def);

  useEffect(() => {
    if (utils.error && isAxiosError(utils.error)) {
      if (utils.error.message?.includes('403')) {
        window.logInfo('Current party is missing roles');
      } else {
        window.logError('Fetching form data failed:\n', utils.error);
      }

      maybeAuthenticationRedirect(utils.error).then();
    }
  }, [url, utils.error]);

  return { data: utils.data, error: utils.error, isFetching: utils.isFetching };
}

export { useFormDataSaveMutation, useIsSavingFormData, useIsSavingFormDataNow };
