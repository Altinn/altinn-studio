import React from 'react';
import { Alert, Button } from '@digdir/design-system-react';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';
import { useTranslation } from 'react-i18next';

import classes from './EditPolicy.module.css';

export const EditPolicy = () => {
  const { t } = useTranslation();
  const { openPolicyEditor } = useBpmnApiContext();
  return (
    <div className={classes.configContent}>
      <Alert severity='info'>
        {t('process_editor.configuration_panel.edit_policy_alert_message')}
      </Alert>
      <Button onClick={openPolicyEditor} variant='tertiary'>
        {t('process_editor.configuration_panel.edit_policy_open_policy_editor_button')}
      </Button>
    </div>
  );
};
