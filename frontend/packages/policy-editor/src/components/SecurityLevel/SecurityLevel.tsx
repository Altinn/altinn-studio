import React, { ReactNode } from 'react';
import classes from './SecurityLevel.module.css';
import { Alert, Paragraph, Select } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { RequiredAuthLevel, PolicyEditorUsage } from '../../types';

export const authlevelOptions = [
  { value: '0', label: '0 - Selvidentifisert bruker Altinn(brukervavn/passord)' },
  { value: '3', label: '3 - MinID' },
  { value: '4', label: '4 - BankID, Buypass' },
];

export type SecurityLevelProps = {
  usageType: PolicyEditorUsage;
  requiredAuthenticationLevelEndUser: RequiredAuthLevel;
  onSave: (authLevel: RequiredAuthLevel) => void;
};

export const SecurityLevel = ({
  usageType,
  requiredAuthenticationLevelEndUser,
  onSave,
}: SecurityLevelProps): ReactNode => {
  const { t } = useTranslation();

  return (
    <>
      <div className={classes.alertWrapper}>
        <Alert severity='info' className={classes.alert}>
          <Paragraph size='small'>
            {t('policy_editor.alert', {
              usageType:
                usageType === 'app'
                  ? t('policy_editor.alert_app')
                  : t('policy_editor.alert_resource'),
            })}
          </Paragraph>
        </Alert>
      </div>
      <div className={classes.selectAuthLevelWrapper}>
        <div className={classes.selectAuthLevel}>
          <Select
            options={authlevelOptions}
            onChange={(authLevel: RequiredAuthLevel) => onSave(authLevel)}
            value={requiredAuthenticationLevelEndUser}
            label={t('policy_editor.select_auth_level_label')}
          />
        </div>
      </div>
    </>
  );
};
