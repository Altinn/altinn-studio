import React, { useState } from 'react';
import classes from './RemoveChangesPopoverContent.module.css';
import {
  StudioTextfield,
  StudioButton,
  StudioSpinner,
  StudioHeading,
} from 'libs/studio-components-legacy/src';
import { StudioParagraph } from 'libs/studio-components/src';
import { useTranslation, Trans } from 'react-i18next';
import { useResetRepositoryMutation } from 'app-shared/hooks/mutations/useResetRepositoryMutation';

export type RemoveChangesPopoverContentProps = {
  onClose: () => void;
  owner: string;
  repoName: string;
};

export const RemoveChangesPopoverContent = ({
  onClose,
  owner,
  repoName,
}: RemoveChangesPopoverContentProps): React.ReactElement => {
  const { t } = useTranslation();
  const { mutate: deleteLocalChanges, isPending: isPendingDeleteLocalChanges } =
    useResetRepositoryMutation(owner, repoName);
  const [canDelete, setCanDelete] = useState<boolean>(false);

  const handleOnKeypressEnter = (event: any) => {
    if (event.key === 'Enter' && canDelete) {
      onDeleteLocalChanges();
    }
  };

  const onDeleteLocalChanges = () => {
    setCanDelete(false);
    deleteLocalChanges(undefined, {
      onSuccess: async () => {
        location.reload();
        onClose();
      },
    });
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const name: string = event.target.value;
    setCanDelete(name === repoName);
  };

  return (
    <div className={classes.wrapper}>
      <StudioHeading level={2} size='sm' spacing>
        {t('overview.reset_repo_confirm_heading')}
      </StudioHeading>
      <StudioParagraph spacing>
        <Trans
          i18nKey={'overview.reset_repo_confirm_info'}
          values={{ repositoryName: repoName }}
          components={{ bold: <strong /> }}
        />
      </StudioParagraph>
      <StudioTextfield
        label={t('overview.reset_repo_confirm_repo_name')}
        onChange={handleChange}
        autoFocus
        onKeyUp={handleOnKeypressEnter}
      />
      {isPendingDeleteLocalChanges && (
        <StudioSpinner showSpinnerTitle={false} spinnerTitle={t('overview.reset_repo_loading')} />
      )}
      {!isPendingDeleteLocalChanges && (
        <div className={classes.buttonContainer}>
          <StudioButton
            color='danger'
            disabled={!canDelete}
            id='confirm-reset-repo-button'
            onClick={onDeleteLocalChanges}
            variant='secondary'
          >
            {t('overview.reset_repo_button')}
          </StudioButton>
          <StudioButton color='second' onClick={onClose} variant='secondary'>
            {t('general.cancel')}
          </StudioButton>
        </div>
      )}
    </div>
  );
};
