import React, { useState } from 'react';
import { StudioPageHeaderButton, StudioPopover, useIsSmallWidth } from '@studio/components';
import { DownloadIcon } from '@studio/icons';
import classes from './FetchChangesPopover.module.css';
import { useTranslation } from 'react-i18next';
import { Notification } from '../Notification';
import { useRepoPullQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useQueryClient } from '@tanstack/react-query';
import { GiteaFetchCompleted } from '../GiteaFetchCompleted';
import { useVersionControlButtonsContext } from '../../context';
import { SyncLoadingIndicator } from '../SyncLoadingIndicator';

// TODO MOVE
const SMALL_WIDTH = 900;

export const FetchChangesPopover = (): React.ReactElement => {
  const {
    isLoading,
    setIsLoading,
    hasMergeConflict,
    commitAndPushChanges,
    repoStatus,
    onPullSuccess,
  } = useVersionControlButtonsContext();

  const { t } = useTranslation();
  const isSmallWidth = useIsSmallWidth(SMALL_WIDTH);
  const { org, app } = useStudioEnvironmentParams();
  const { refetch: fetchPullData } = useRepoPullQuery(org, app, true);
  const queryClient = useQueryClient();

  const [popoverOpen, setPopoverOpen] = useState(false);

  const displayNotification: boolean = (repoStatus?.behindBy > 0 ?? false) && !hasMergeConflict;

  const handleClosePopover = () => setPopoverOpen(false);

  const handleOpenPopover = async () => {
    setPopoverOpen(true);

    setIsLoading(true);
    const { data: result } = await fetchPullData();
    setIsLoading(false);

    if (result.repositoryStatus === 'Ok') {
      if (onPullSuccess) onPullSuccess();

      await queryClient.invalidateQueries();
    } else if (result.hasMergeConflict || result.repositoryStatus === 'CheckoutConflict') {
      await commitAndPushChanges('');
      setPopoverOpen(false);
    }
  };

  return (
    <StudioPopover open={popoverOpen} onClose={handleClosePopover} placement='bottom-end'>
      <StudioPopover.Trigger asChild>
        <StudioPageHeaderButton
          color='light'
          variant='regular'
          onClick={handleOpenPopover}
          disabled={hasMergeConflict}
          icon={<DownloadIcon />}
        >
          {!isSmallWidth && t('sync_header.fetch_changes')}
          {displayNotification && <Notification numChanges={repoStatus?.behindBy ?? 0} />}
        </StudioPageHeaderButton>
      </StudioPopover.Trigger>
      <StudioPopover.Content className={classes.popoverContent}>
        {isLoading && <SyncLoadingIndicator heading={t('sync_header.fetching_latest_version')} />}
        {!isLoading && <GiteaFetchCompleted heading={t('sync_header.service_updated_to_latest')} />}
      </StudioPopover.Content>
    </StudioPopover>
  );
};
