import React, { useState } from 'react';
import classes from './RemoveChangesPopoverContent.module.css';
import { Heading, Paragraph } from '@digdir/designsystemet-react';
import { StudioTextfield, StudioButton, StudioSpinner } from '@studio/components';
import { useTranslation, Trans } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useResetRepositoryMutation } from 'app-shared/hooks/mutations/useResetRepositoryMutation';
import { toast } from 'react-toastify';

export type RemoveChangesPopoverContentProps = {
  onClose: () => void;
};

export const RemoveChangesPopoverContent = ({
  onClose,
}: RemoveChangesPopoverContentProps): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();

  const queryClient = useQueryClient();
  const repoResetMutation = useResetRepositoryMutation(org, app);

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
    setCanDelete(name === app);
  };

  return (
    <div className={classes.wrapper}>
      <Heading level={2} size='small' spacing>
        {t('overview.reset_repo_confirm_heading')}
      </Heading>
      <Paragraph size='small' spacing>
        <Trans
          i18nKey={'overview.reset_repo_confirm_info'}
          values={{ repositoryName: app }}
          components={{ bold: <strong /> }}
        />
      </Paragraph>
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
