import type { ReactNode } from 'react';
import classes from './SecurityLevelSelect.module.css';
import {
  StudioSelect,
  StudioLink,
  StudioHeading,
  StudioParagraph,
  StudioAlert,
  StudioCheckbox,
} from '@studio/components';
import { ExternalLinkIcon } from '@studio/icons';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';
import type { RemovedAuthLevel, RequiredAuthLevel } from '../../types';

const URL_TO_SECURITY_LEVEL_PAGE: string =
  'https://info.altinn.no/hjelp/innlogging/diverse-om-innlogging/hva-er-sikkerhetsniva/';

const SYSTEM_USER_AUTH_LEVEL_VALUE: string = 'system-user-auth-level';

const AUTH_LEVEL_3: RequiredAuthLevel = '3';
const AUTH_LEVEL_4: RequiredAuthLevel = '4';

export const authlevelOptions = [
  { value: '0', label: 'policy_editor.auth_level_option_0' },
  { value: AUTH_LEVEL_3, label: 'policy_editor.auth_level_option_3' },
  { value: AUTH_LEVEL_4, label: 'policy_editor.auth_level_option_4' },
];

export type SecurityLevelSelectProps = {
  requiredAuthenticationLevelEndUser: RequiredAuthLevel | RemovedAuthLevel;
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
  const hasRemovedAuthLevel: boolean = !authlevelOptions.some(
    (option) => option.value === requiredAuthenticationLevelEndUser,
  );

  const isSystemUserAllowed: boolean = requiredAuthenticationLevelSystemUser === AUTH_LEVEL_3;

  const handleEndUserAuthLevelChange = (authLevel: RequiredAuthLevel): void => {
    // The system user exception lets more users in, so it is always removed when the security
    // level changes. The user must then actively allow it again.
    onSave(authLevel, undefined);
  };

  const handleSystemUserAllowedChange = (allowSystemUser: boolean): void => {
    onSave(AUTH_LEVEL_4, allowSystemUser ? AUTH_LEVEL_3 : undefined);
  };

  return (
    <div>
      <StudioHeading level={4} data-size='xs' spacing>
        {t('policy_editor.security_level_label')}
      </StudioHeading>
      <StudioParagraph spacing>
        {t('policy_editor.security_level_description')}{' '}
        <StudioLink
          href={URL_TO_SECURITY_LEVEL_PAGE}
          target='_blank'
          rel='noopener noreferrer'
          icon={<ExternalLinkIcon title={t('general.link_opens_in_new_tab')} />}
          iconPlacement='right'
        >
          {t('policy_editor.security_level_read_more')}
        </StudioLink>
      </StudioParagraph>
      <div>
        <StudioSelect
          label={t('policy_editor.select_auth_level_label')}
          className={cn(classes.select, classes.bottomSpacing)}
          error={hasRemovedAuthLevel && t('policy_editor.auth_level_removed_error')}
          onChange={(event) =>
            handleEndUserAuthLevelChange(event.target.value as RequiredAuthLevel)
          }
          value={requiredAuthenticationLevelEndUser}
        >
          {hasRemovedAuthLevel && (
            <StudioSelect.Option value={requiredAuthenticationLevelEndUser} disabled>
              {t('policy_editor.auth_level_option_removed', {
                level: requiredAuthenticationLevelEndUser,
              })}
            </StudioSelect.Option>
          )}
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
            <StudioParagraph className={classes.description}>
              {t('policy_editor.system_user_auth_level_description')}
            </StudioParagraph>
            <StudioCheckbox
              label={t('policy_editor.system_user_auth_level_checkbox_label')}
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
