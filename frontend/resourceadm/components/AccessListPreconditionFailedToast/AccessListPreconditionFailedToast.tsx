import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton } from '@studio/components';

export const AccessListPreconditionFailedToast = (): React.ReactNode => {
  const { t } = useTranslation();

  return (
    <div>
      <div>{t('resourceadm.listadmin_list_sim_update_error')}</div>
      <StudioButton variant='secondary' onClick={() => window.location.reload()}>
        {t('resourceadm.listadmin_list_sim_update_refresh')}
      </StudioButton>
    </div>
  );
};
