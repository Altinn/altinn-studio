import React from 'react';
import { Alert, Heading } from '@digdir/design-system-react';
import { StudioButton } from '@studio/components';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';
import { useTranslation } from 'react-i18next';

import classes from './EditPolicy.module.css';
import { ShieldLockIcon } from '@studio/icons';

export const EditPolicy = () => {
  const { t } = useTranslation();
  const { openPolicyEditor } = useBpmnApiContext();

  return (
    <div className={classes.configContent}>
      <Alert severity='info'>
        {t('process_editor.configuration_panel.edit_policy_alert_message')}
      </Alert>
      <div className={classes.policyButtonPanel}>
        <Heading level={3} size='xxsmall' spacing>
          {t('process_editor.configuration_panel.edit_policy_open_policy_editor_heading')}
        </Heading>
        <StudioButton
          onClick={openPolicyEditor}
          variant='primary'
          color='second'
          icon={<ShieldLockIcon />}
          iconPlacement='left'
          className={classes.policyEditorButton}
        >
          {t('process_editor.configuration_panel.edit_policy_open_policy_editor_button')}
        </StudioButton>
      </div>
    </div>
  );
};
