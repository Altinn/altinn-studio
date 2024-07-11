import React from 'react';
import classes from './PolicyEditorAlert.module.css';
import { Alert, Paragraph } from '@digdir/designsystemet-react';
import { usePolicyEditorContext } from '../../contexts/PolicyEditorContext';
import { useTranslation } from 'react-i18next';

export const PolicyEditorAlert = (): React.ReactElement => {
  const { usageType } = usePolicyEditorContext();
  const { t } = useTranslation();

  return (
    <Alert severity='info' className={classes.alert}>
      <Paragraph size='small'>
        {t('policy_editor.alert', {
          usageType:
            usageType === 'app' ? t('policy_editor.alert_app') : t('policy_editor.alert_resource'),
        })}
      </Paragraph>
    </Alert>
  );
};
