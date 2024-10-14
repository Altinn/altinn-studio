import React from 'react';
import { Alert } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import classes from './NoSubformLayoutsExist.module.css';

export const NoSubformLayoutsExist = () => {
  const { t } = useTranslation();

  return (
    <Alert className={classes.alert} size='small'>
      {t('ux_editor.component_properties.subform.no_layout_sets_acting_as_subform')}
    </Alert>
  );
};
