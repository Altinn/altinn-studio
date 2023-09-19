import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { TabHeader } from '../../TabHeader';

export type AccessControlTabProps = {};

export const AccessControlTab = ({}: AccessControlTabProps): ReactNode => {
  const { t } = useTranslation();

  return (
    <div>
      <TabHeader text={t('settings_modal.access_control_tab_heading')} />
    </div>
  );
};
