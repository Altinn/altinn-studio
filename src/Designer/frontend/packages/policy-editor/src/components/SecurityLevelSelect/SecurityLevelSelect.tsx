import type { ReactNode } from 'react';
import classes from './SecurityLevelSelect.module.css';
import { StudioHelpText, StudioSelect, StudioLabel, StudioLink, StudioHeading, StudioParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { RequiredAuthLevel } from '../../types';

const SELECT_AUTH_LEVEL_ID: string = 'select-auth-level';
const URL_TO_SECURITY_LEVEL_PAGE: string =
  'https://info.altinn.no/hjelp/innlogging/diverse-om-innlogging/hva-er-sikkerhetsniva/';

export const authlevelOptions = [
  { value: '0', label: 'policy_editor.auth_level_option_0' },
  { value: '1', label: 'policy_editor.auth_level_option_1' },
  { value: '2', label: 'policy_editor.auth_level_option_2' },
  { value: '3', label: 'policy_editor.auth_level_option_3' },
  { value: '4', label: 'policy_editor.auth_level_option_4' },
];

export type SecurityLevelSelectProps = {
  requiredAuthenticationLevelEndUser: RequiredAuthLevel;
  onSave: (authLevel: RequiredAuthLevel) => void;
};

export const SecurityLevelSelect = ({
  requiredAuthenticationLevelEndUser,
  onSave,
}: SecurityLevelSelectProps): ReactNode => {
  const { t } = useTranslation();

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
          onChange={(event) => {
            onSave(event.target.value as RequiredAuthLevel);
          }}
          value={requiredAuthenticationLevelEndUser}
          id={SELECT_AUTH_LEVEL_ID}
        >
          {authlevelOptions.map((option) => (
            <StudioSelect.Option key={option.value} value={option.value}>
              {t(option.label)}
            </StudioSelect.Option>
          ))}
        </StudioSelect>
      </div>
    </div>
  );
};
