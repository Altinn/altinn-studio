import type { ReactNode } from 'react';
import { StudioSelect, StudioLink, StudioHeading, StudioParagraph } from '@studio/components';
import { ExternalLinkIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import type { RequiredAuthLevel } from '../../types';

const URL_TO_SECURITY_LEVEL_PAGE: string =
  'https://info.altinn.no/hjelp/innlogging/diverse-om-innlogging/hva-er-sikkerhetsniva/';

export const authlevelOptions = [
  { value: '0', label: 'policy_editor.auth_level_option_0' },
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
        label={t('policy_editor.select_auth_level_label')}
        onChange={(event) => {
          onSave(event.target.value as RequiredAuthLevel);
        }}
        value={requiredAuthenticationLevelEndUser}
      >
        {authlevelOptions.map((option) => (
          <StudioSelect.Option key={option.value} value={option.value}>
            {t(option.label)}
          </StudioSelect.Option>
        ))}
      </StudioSelect>
    </div>
  );
};
