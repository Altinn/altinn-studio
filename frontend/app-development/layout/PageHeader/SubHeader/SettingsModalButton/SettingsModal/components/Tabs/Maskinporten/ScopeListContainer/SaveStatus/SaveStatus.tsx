import React, { type ReactElement } from 'react';
import classes from './SaveStatus.module.css';
import { StudioParagraph, StudioSpinner } from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';
import { CheckmarkIcon } from '@studio/icons';

type SaveStatusProps = {
  isPending: boolean;
  isSaved: boolean;
};

export const SaveStatus = ({ isPending, isSaved }: SaveStatusProps): ReactElement => {
  const { t } = useTranslation();

  if (isPending) {
    return (
      <SaveStatusContent
        text={t('settings_modal.maskinporten_tab_save_scopes_pending')}
        isPending
      />
    );
  }
  if (isSaved) {
    return <SaveStatusContent text={t('settings_modal.maskinporten_tab_save_scopes_complete')} />;
  }
  return null;
};

type SaveStatusContentProps = {
  text: string;
  isPending?: boolean;
};

const SaveStatusContent = ({ text, isPending = false }: SaveStatusContentProps): ReactElement => {
  const { t } = useTranslation();

  return (
    <div className={classes.savingContainer}>
      <StudioParagraph size='sm'>{text}</StudioParagraph>
      {isPending ? (
        <StudioSpinner
          spinnerTitle={t('settings_modal.maskinporten_tab_save_scopes_pending_spinner')}
          size='sm'
        />
      ) : (
        <CheckmarkIcon className={classes.savedIcon} />
      )}
    </div>
  );
};
