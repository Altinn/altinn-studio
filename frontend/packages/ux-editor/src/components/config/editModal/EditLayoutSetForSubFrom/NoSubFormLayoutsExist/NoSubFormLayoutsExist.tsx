import React from 'react';
import { Alert } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';

export const NoSubFormLayoutsExist = () => {
  const { t } = useTranslation();

  return (
    <Alert size='small' title={'NoSubFormLayoutsExistAlert'}>
      {t('ux_editor.component_properties.subform.no_layout_sets_acting_as_subform')}
    </Alert>
  );
};
