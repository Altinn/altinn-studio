import React from 'react';
import classes from './RepoNameInput.module.css';
import type { TextfieldProps } from '@digdir/designsystemet-react';
import { Paragraph, Textfield } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';

type RepoNameInputProps = {
  repoName?: string;
  errorMessage?: string;
} & TextfieldProps;

export const RepoNameInput = ({ repoName, errorMessage, name, onChange }: RepoNameInputProps) => {
  const { t } = useTranslation();

  return (
    <div>
      <Textfield
        name={name}
        id='service-saved-name'
        label={t('general.service_name')}
        defaultValue={repoName}
        error={errorMessage}
        onChange={onChange}
        size='small'
      />
      <Paragraph size='small' className={classes.textWrapper}>
        {t('dashboard.service_saved_name_description')}{' '}
        <strong style={{ fontWeight: '500' }}>
          {t('dashboard.service_saved_name_description_cannot_be_changed')}
        </strong>
      </Paragraph>
    </div>
  );
};
