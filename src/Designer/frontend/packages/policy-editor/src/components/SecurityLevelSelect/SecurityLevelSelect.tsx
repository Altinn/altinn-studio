import type { ReactNode } from 'react';
import classes from './SecurityLevelSelect.module.css';
import { StudioSelect, StudioLink, StudioHeading, StudioParagraph } from '@studio/components';
import { ExternalLinkIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import type { RemovedAuthLevel, RequiredAuthLevel } from '../../types';

const URL_TO_SECURITY_LEVEL_PAGE: string =
  'https://info.altinn.no/hjelp/innlogging/diverse-om-innlogging/hva-er-sikkerhetsniva/';

export const authlevelOptions = [
  { value: '0', label: 'policy_editor.auth_level_option_0' },
  { value: '3', label: 'policy_editor.auth_level_option_3' },
  { value: '4', label: 'policy_editor.auth_level_option_4' },
];

export type SecurityLevelSelectProps = {
  requiredAuthenticationLevelEndUser: RequiredAuthLevel | RemovedAuthLevel;
  onSave: (authLevel: RequiredAuthLevel) => void;
};

export const SecurityLevelSelect = ({
  requiredAuthenticationLevelEndUser,
  onSave,
}: SecurityLevelSelectProps): ReactNode => {
  const { t } = useTranslation();
  const hasRemovedAuthLevel: boolean = !authlevelOptions.some(
    (option) => option.value === requiredAuthenticationLevelEndUser,
  );

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
          icon={<ExternalLinkIcon />}
          iconPlacement='right'
        >
          {t('policy_editor.security_level_read_more')}
        </StudioLink>
      </StudioParagraph>
      <StudioSelect
        className={classes.select}
        label={t('policy_editor.select_auth_level_label')}
        error={hasRemovedAuthLevel && t('policy_editor.auth_level_removed_error')}
        onChange={(event) => {
          onSave(event.target.value as RequiredAuthLevel);
        }}
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
    </div>
  );
};
