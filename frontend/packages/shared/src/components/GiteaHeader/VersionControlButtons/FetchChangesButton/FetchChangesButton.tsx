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

export type FetchChangesProps = {
  hasMergeConflict: boolean; // context
  handleMergeConflict: () => Promise<void>; // context
  displayNotification: boolean;
  numChanges: number;
};
export const FetchChanges = ({
  hasMergeConflict,
  handleMergeConflict,
  displayNotification,
  numChanges,
}: FetchChangesProps): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { refetch: fetchPullData } = useRepoPullQuery(org, app, true);
  const queryClient = useQueryClient();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClosePopover = () => setPopoverOpen(false);

  const handleOpenPopover = async () => {
    setPopoverOpen(true);

    setLoading(true);
    const { data: result } = await fetchPullData();
    if (result.repositoryStatus === 'Ok') {
      setLoading(false);
      await queryClient.invalidateQueries(); // Todo: This invalidates ALL queries. Consider providing a list of relevant queries only.
    } else if (result.hasMergeConflict || result.repositoryStatus === 'CheckoutConflict') {
      await handleMergeConflict();
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
        {!loading && <GiteaFetchCompleted heading={t('sync_header.service_updated_to_latest')} />}
        {loading && <FetchingFromGitea />}
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
