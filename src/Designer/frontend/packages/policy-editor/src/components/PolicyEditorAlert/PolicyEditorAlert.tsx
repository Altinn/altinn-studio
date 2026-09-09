import React from 'react';
import classes from './PolicyEditorAlert.module.css';
import { StudioParagraph, StudioAlert } from '@studio/components';
import { usePolicyEditorContext } from '../../contexts/PolicyEditorContext';
import { useTranslation } from 'react-i18next';

export const PolicyEditorAlert = (): React.ReactElement => {
  const { usageType, policyRules } = usePolicyEditorContext();
  const { t } = useTranslation();

  if (policyRules.length > 0) {
    return null;
  }

  return (
    <StudioAlert data-color='info' className={classes.alert}>
      <StudioParagraph>
        {t('policy_editor.alert', {
          usageType:
            usageType === 'app' ? t('policy_editor.alert_app') : t('policy_editor.alert_resource'),
        })}
      </StudioParagraph>
    </StudioAlert>
  );
};
