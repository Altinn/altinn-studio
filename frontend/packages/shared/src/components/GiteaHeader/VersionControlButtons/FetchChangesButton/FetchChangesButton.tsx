import React, { useState } from 'react';
import { StudioPopover, StudioSpinner } from '@studio/components';
import { DownloadIcon } from '@studio/icons';
import classes from './FetchChangesButton.module.css';
import { useTranslation } from 'react-i18next';
import { Notification } from '../Notification';
import { Heading } from '@digdir/design-system-react';
import { useRepoPullQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useQueryClient } from '@tanstack/react-query';
import { GiteaFetchCompleted } from '../GiteaFetchCompleted';
import { useVersionControlButtonsContext } from '../context';

export type FetchChangesProps = {
  displayNotification: boolean;
  numChanges: number;
};
export const FetchChanges = ({
  displayNotification,
  numChanges,
}: FetchChangesProps): React.ReactElement => {
  const { isLoading, setIsLoading, hasMergeConflict, commitAndPushChanges } =
    useVersionControlButtonsContext();

  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { refetch: fetchPullData } = useRepoPullQuery(org, app, true);
  const queryClient = useQueryClient();

  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleClosePopover = () => setPopoverOpen(false);

  const handleOpenPopover = async () => {
    setPopoverOpen(true);

    setIsLoading(true);
    const { data: result } = await fetchPullData();
    setIsLoading(false);

    if (result.repositoryStatus === 'Ok') {
      await queryClient.invalidateQueries(); // Todo: This invalidates ALL queries. Consider providing a list of relevant queries only.
    } else if (result.hasMergeConflict || result.repositoryStatus === 'CheckoutConflict') {
      await commitAndPushChanges('');
      setPopoverOpen(false);
    }
  };

  return (
    <StudioPopover open={popoverOpen} onClose={handleClosePopover} placement='bottom'>
      <StudioPopover.Trigger
        color='inverted'
        size='small'
        variant='tertiary'
        onClick={handleOpenPopover}
        disabled={hasMergeConflict}
      >
        <DownloadIcon />
        {t('sync_header.fetch_changes')}
        {displayNotification && !hasMergeConflict && <Notification numChanges={numChanges} />}
      </StudioPopover.Trigger>
      <StudioPopover.Content className={classes.popoverContent}>
        {!isLoading && <GiteaFetchCompleted heading={t('sync_header.service_updated_to_latest')} />}
        {isLoading && <FetchingFromGitea />}
      </StudioPopover.Content>
    </StudioPopover>
  );
};

const FetchingFromGitea = () => {
  const { t } = useTranslation();

  return (
    <>
      <Heading size='xxsmall' level={3}>
        {t('sync_header.fetching_latest_version')}
      </Heading>
      <StudioSpinner showSpinnerTitle={false} spinnerTitle={t('sync_modal.loading')} />
    </>
  );
};
