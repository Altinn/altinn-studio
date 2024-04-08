import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AxiosError } from 'axios';
import { Alert } from '@digdir/design-system-react';
import { getEnvLabel } from 'resourceadm/utils/resourceUtils';
import { type EnvId } from 'resourceadm/utils/resourceUtils';

interface AccessListErrorMessageProps {
  error: AxiosError;
  env: EnvId;
}

export const AccessListErrorMessage = ({
  error,
  env,
}: AccessListErrorMessageProps): React.JSX.Element => {
  const { t } = useTranslation();

  let errorMessage = t('resourceadm.listadmin_load_list_error');
  if (error?.response?.status === 403)
    errorMessage = t('resourceadm.loading_access_list_permission_denied', {
      envName: t(getEnvLabel(env)),
    });

  return <Alert severity='danger'>{errorMessage}</Alert>;
};
