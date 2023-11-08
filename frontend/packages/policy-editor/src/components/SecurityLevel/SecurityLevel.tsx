import React, { ReactNode } from 'react';
import classes from './SecurityLevel.module.css';
import { Select, Label, Paragraph, HelpText, Link } from '@digdir/design-system-react';
import { useTranslation, Trans } from 'react-i18next';
import { RequiredAuthLevel } from '../../types';

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

export type SecurityLevelProps = {
  requiredAuthenticationLevelEndUser: RequiredAuthLevel;
  onSave: (authLevel: RequiredAuthLevel) => void;
};

export const SecurityLevel = ({
  requiredAuthenticationLevelEndUser,
  onSave,
}: SecurityLevelProps): ReactNode => {
  const { t } = useTranslation();

  const authLevelOptionKeysAsDisplayStrings = authlevelOptions.map((option) => ({
    ...option,
    label: t(option.label),
  }));

  return (
    <div>
      <Label as='p' size='medium' spacing>
        {t('policy_editor.security_level_label')}
      </Label>
      <Paragraph className={classes.paragraph} size='small'>
        {t('policy_editor.security_level_description')}
      </Paragraph>
      <div className={classes.selectAuthLevel}>
        <div className={classes.labelAndHelpTextWrapper}>
          {/* This is added because the 'label' in the Select component is not bold */}
          <Label size='small' htmlFor={SELECT_AUTH_LEVEL_ID}>
            {t('policy_editor.select_auth_level_label')}
          </Label>
          <HelpText title={t('policy_editor.select_auth_level_help_text')}>
            <Trans i18nKey={'policy_editor.select_auth_level_help_text_content'}>
              <Link
                href={URL_TO_SECURITY_LEVEL_PAGE}
                target='_newTab'
                rel='noopener noreferrer'
                className={classes.link}
                // This is needed to be inline in the code for some reason. If moved to CSS, the text and the link is placed on different lines
                style={{ display: 'inline' }}
              >
                sikkerhetsnivå og innlogging for sluttbruker
              </Link>
            </Trans>
          </HelpText>
        </div>
        <Select
          options={authLevelOptionKeysAsDisplayStrings}
          onChange={(authLevel: RequiredAuthLevel) => onSave(authLevel)}
          value={requiredAuthenticationLevelEndUser}
          inputId={SELECT_AUTH_LEVEL_ID}
        />
      </div>
    </div>
  );
};
