import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import classes from './SecurityLevelSelect.module.css';
import {
  Heading,
  Label,
  Paragraph,
  HelpText,
  Link,
  LegacySelect,
} from '@digdir/design-system-react';
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

/**
 * @component
 *    Displays the security level area in the policy editor
 *
 * @property {RequiredAuthLevel}[requiredAuthenticationLevelEndUser] - The required auth level in the policy
 * @property {function}[onSave] - Function to be executed when saving the policy
 *
 * @returns {ReactNode} - The rendered component
 */
export const SecurityLevelSelect = ({
  requiredAuthenticationLevelEndUser,
  onSave,
}: SecurityLevelSelectProps): ReactNode => {
  const { t } = useTranslation();

  const authLevelOptionKeysAsDisplayStrings = useMemo(() => {
    return authlevelOptions.map((option) => ({
      ...option,
      label: t(option.label),
    }));
  }, [t]);

  return (
    <div className={classes.securityLevelContainer}>
      <Heading level={2} size='xxsmall' spacing>
        {t('policy_editor.security_level_label')}
      </Heading>
      <Paragraph className={classes.paragraph} size='small'>
        {t('policy_editor.security_level_description')}
      </Paragraph>
      <div className={classes.selectAuthLevel}>
        <div className={classes.labelAndHelpTextWrapper}>
          {/* This is added because the 'label' in the Select component is not bold */}
          <Label size='small' htmlFor={SELECT_AUTH_LEVEL_ID}>
            {t('policy_editor.select_auth_level_label')}
          </Label>
          <HelpText size='small' title={t('policy_editor.select_auth_level_help_text')}>
            <Link
              href={URL_TO_SECURITY_LEVEL_PAGE}
              target='_newTab'
              rel='noopener noreferrer'
              className={classes.link}
            >
              {t('policy_editor.select_auth_level_help_text_content')}
            </Link>
          </HelpText>
        </div>
        <LegacySelect
          options={authLevelOptionKeysAsDisplayStrings}
          onChange={(authLevel: RequiredAuthLevel) => onSave(authLevel)}
          value={requiredAuthenticationLevelEndUser}
          inputId={SELECT_AUTH_LEVEL_ID}
        />
      </div>
    </div>
  );
};
