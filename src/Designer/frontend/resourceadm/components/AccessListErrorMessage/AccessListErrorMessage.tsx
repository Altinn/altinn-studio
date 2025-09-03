import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioAlert } from '@studio/components';
import { getEnvLabel } from '../../utils/resourceUtils';
import { type EnvId } from '../../utils/resourceUtils';
import type { ResourceError } from 'app-shared/types/ResourceAdm';

interface AccessListErrorMessageProps {
  error: ResourceError;
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

  return <StudioAlert data-color='danger'>{errorMessage}</StudioAlert>;
};
