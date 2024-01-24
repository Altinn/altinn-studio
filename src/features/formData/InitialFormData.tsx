import React from 'react';
import type { PropsWithChildren } from 'react';

import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { useCurrentDataModelUrl } from 'src/features/datamodel/useBindingSchema';
import { usePageSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { FormDataReaderProvider } from 'src/features/formData/FormDataReaders';
import { FormDataWriteProvider } from 'src/features/formData/FormDataWrite';
import { useFormDataQuery } from 'src/features/formData/useFormDataQuery';
import { MissingRolesError } from 'src/features/instantiate/containers/MissingRolesError';
import { isAxiosError } from 'src/utils/isAxiosError';
import { HttpStatusCodes } from 'src/utils/network/networking';

/**
 * This provider loads the initial form data for a data task, and then provides a FormDataWriteProvider with that
 * initial data. When this is provided, you'll have the tools needed to read/write form data.
 */
export function InitialFormDataProvider({ children }: PropsWithChildren) {
  const url = useCurrentDataModelUrl();
  const { error, isLoading, data } = useFormDataQuery(url);
  const autoSaveBehaviour = usePageSettings().autoSaveBehavior;

  if (!url) {
    throw new Error('InitialFormDataProvider cannot be provided without a url');
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
      <FormDataReaderProvider>{children}</FormDataReaderProvider>
    </FormDataWriteProvider>
  );
}
