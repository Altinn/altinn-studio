import React from 'react';
import { Alert } from '@digdir/designsystemet-react';
import { StudioButton, StudioRedirectBox } from '@studio/components-legacy';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';
import { useTranslation } from 'react-i18next';
import { ShieldLockIcon } from '@studio/icons';
import classes from './EditPolicy.module.css';

export const EditPolicy = () => {
  const { t } = useTranslation();
  const { openPolicyEditor } = useBpmnApiContext();

  return (
    <div className={classes.configContent}>
      <Alert severity='info' className={classes.alert}>
        {t('process_editor.configuration_panel.edit_policy_alert_message')}
      </Alert>
      <StudioRedirectBox
        title={t('process_editor.configuration_panel.edit_policy_open_policy_editor_heading')}
      >
        <StudioButton
          onClick={openPolicyEditor}
          variant='primary'
          color='second'
          icon={<ShieldLockIcon />}
          iconPlacement='left'
        >
          {t('process_editor.configuration_panel.edit_policy_open_policy_editor_button')}
        </StudioButton>
      </StudioRedirectBox>
    </div>
  );
};
