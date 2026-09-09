import type { ReactNode } from 'react';
import classes from './SecurityLevelSelect.module.css';
import {
  StudioHelpText,
  StudioSelect,
  StudioLabel,
  StudioLink,
  StudioHeading,
  StudioParagraph,
  StudioAlert,
  StudioCheckbox,
} from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { RequiredAuthLevel } from '../../types';

const SELECT_AUTH_LEVEL_ID: string = 'select-auth-level';
const URL_TO_SECURITY_LEVEL_PAGE: string =
  'https://info.altinn.no/hjelp/innlogging/diverse-om-innlogging/hva-er-sikkerhetsniva/';

const SYSTEM_USER_AUTH_LEVEL_VALUE: string = 'system-user-auth-level';

const AUTH_LEVEL_3: RequiredAuthLevel = '3';
const AUTH_LEVEL_4: RequiredAuthLevel = '4';

export const authlevelOptions = [
  { value: '0', label: 'policy_editor.auth_level_option_0' },
  { value: '1', label: 'policy_editor.auth_level_option_1' },
  { value: '2', label: 'policy_editor.auth_level_option_2' },
  { value: AUTH_LEVEL_3, label: 'policy_editor.auth_level_option_3' },
  { value: AUTH_LEVEL_4, label: 'policy_editor.auth_level_option_4' },
];

export type SecurityLevelSelectProps = {
  requiredAuthenticationLevelEndUser: RequiredAuthLevel;
  requiredAuthenticationLevelSystemUser?: RequiredAuthLevel;
  onSave: (
    authLevel: RequiredAuthLevel,
    systemUserAuthLevel: RequiredAuthLevel | undefined,
  ) => void;
};

export const SecurityLevelSelect = ({
  requiredAuthenticationLevelEndUser,
  requiredAuthenticationLevelSystemUser,
  onSave,
}: SecurityLevelSelectProps): ReactNode => {
  const { t } = useTranslation();

  const isSystemUserAllowed: boolean = requiredAuthenticationLevelSystemUser === AUTH_LEVEL_3;

  const handleEndUserAuthLevelChange = (authLevel: RequiredAuthLevel): void => {
    // The system user exception only has a meaning when end users are required to have level 4,
    // so lowering the security level removes it again.
    const systemUserAuthLevel =
      authLevel === AUTH_LEVEL_4 ? requiredAuthenticationLevelSystemUser : undefined;
    onSave(authLevel, systemUserAuthLevel);
  };

  const handleSystemUserAllowedChange = (allowSystemUser: boolean): void => {
    onSave(requiredAuthenticationLevelEndUser, allowSystemUser ? AUTH_LEVEL_3 : undefined);
  };

  return (
    <div>
      <StudioHeading level={4} data-size='xs' spacing>
        {t('policy_editor.security_level_label')}
      </StudioHeading>
      <StudioParagraph spacing>{t('policy_editor.security_level_description')}</StudioParagraph>
      <div>
        <div className={classes.labelAndHelpTextWrapper}>
          <StudioLabel htmlFor={SELECT_AUTH_LEVEL_ID}>
            {t('policy_editor.select_auth_level_label')}
          </StudioLabel>
          <StudioHelpText aria-label={t('policy_editor.select_auth_level_help_text')}>
            <StudioLink
              href={URL_TO_SECURITY_LEVEL_PAGE}
              target='_newTab'
              rel='noopener noreferrer'
              className={classes.link}
            >
              {t('policy_editor.select_auth_level_help_text_content')}
            </StudioLink>
          </StudioHelpText>
        </div>
        <StudioSelect
          label={''}
          className={classes.bottomSpacing}
          onChange={(event) =>
            handleEndUserAuthLevelChange(event.target.value as RequiredAuthLevel)
          }
          value={requiredAuthenticationLevelEndUser}
          id={SELECT_AUTH_LEVEL_ID}
        >
          {authlevelOptions.map((option) => (
            <StudioSelect.Option key={option.value} value={option.value}>
              {t(option.label)}
            </StudioSelect.Option>
          ))}
        </StudioSelect>
        {requiredAuthenticationLevelEndUser === AUTH_LEVEL_4 && (
          <StudioAlert data-color='info'>
            <StudioHeading level={5} data-size='xs'>
              {t('policy_editor.system_user_auth_level_heading')}
            </StudioHeading>
            <StudioParagraph className={classes.bottomSpacing}>
              {t('policy_editor.system_user_auth_level_description')}
            </StudioParagraph>
            <StudioCheckbox
              label={t('policy_editor.system_user_auth_level_checkbox_label')}
              description={t('policy_editor.system_user_auth_level_checkbox_description')}
              value={SYSTEM_USER_AUTH_LEVEL_VALUE}
              checked={isSystemUserAllowed}
              onChange={(event) => handleSystemUserAllowedChange(event.target.checked)}
            />
          </StudioAlert>
        )}
      </div>
    </div>
  );
};
