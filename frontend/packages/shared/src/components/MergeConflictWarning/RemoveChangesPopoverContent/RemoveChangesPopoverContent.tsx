import React, { useState } from 'react';
import classes from './RemoveChangesPopoverContent.module.css';
import {
  StudioTextfield,
  StudioButton,
  StudioSpinner,
  StudioHeading,
} from '@studio/components-legacy';
import { StudioParagraph } from '@studio/components';
import { useTranslation, Trans } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useResetRepositoryMutation } from 'app-shared/hooks/mutations/useResetRepositoryMutation';
import { toast } from 'react-toastify';

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

  const queryClient = useQueryClient();
  const repoResetMutation = useResetRepositoryMutation(owner, repoName);

  const [canDelete, setCanDelete] = useState<boolean>(false);

  const handleOnKeypressEnter = (event: any) => {
    if (event.key === 'Enter' && canDelete) {
      onResetWrapper();
    }
  };

  const onResetWrapper = () => {
    setCanDelete(false);
    repoResetMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(t('overview.reset_repo_completed'));
        queryClient.removeQueries();
        onCloseWrapper();
      },
    });
  };

  const onCloseWrapper = () => {
    repoResetMutation.reset();
    onClose();
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
      {repoResetMutation.isPending && (
        <StudioSpinner showSpinnerTitle={false} spinnerTitle={t('overview.reset_repo_loading')} />
      )}
      {!repoResetMutation.isPending && (
        <div className={classes.buttonContainer}>
          <StudioButton
            color='danger'
            disabled={!canDelete}
            id='confirm-reset-repo-button'
            onClick={onResetWrapper}
            variant='secondary'
          >
            {t('overview.reset_repo_button')}
          </StudioButton>
          <StudioButton color='second' onClick={onCloseWrapper} variant='secondary'>
            {t('general.cancel')}
          </StudioButton>
        </div>
      )}
    </div>
  );
};
