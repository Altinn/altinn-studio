import React, { useState } from 'react';
import { StudioPageHeader, StudioPopover, useMediaQuery } from 'libs/studio-components-legacy/src';
import { DownloadIcon } from 'libs/studio-icons/src';
import classes from './FetchChangesPopover.module.css';
import { useTranslation } from 'react-i18next';
import { Notification } from '../Notification';
import { useRepoPullQuery } from 'app-shared/hooks/queries';
import { useQueryClient } from '@tanstack/react-query';
import { GiteaFetchCompleted } from '../GiteaFetchCompleted';
import { useVersionControlButtonsContext } from '../../context';
import { SyncLoadingIndicator } from '../SyncLoadingIndicator';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { useGiteaHeaderContext } from '../../../context/GiteaHeaderContext';

export const FetchChangesPopover = (): React.ReactElement => {
  const {
    isLoading,
    setIsLoading,
    hasMergeConflict,
    commitAndPushChanges,
    repoStatus,
    onPullSuccess,
  } = useVersionControlButtonsContext();

  const { owner, repoName } = useGiteaHeaderContext();
  const { t } = useTranslation();
  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const { refetch: fetchPullData } = useRepoPullQuery(owner, repoName, true);
  const queryClient = useQueryClient();

  const [popoverOpen, setPopoverOpen] = useState(false);

  const displayNotification: boolean =
    repoStatus?.behindBy !== undefined &&
    repoStatus?.behindBy !== null &&
    repoStatus.behindBy > 0 &&
    !hasMergeConflict;

  const handleClosePopover = () => setPopoverOpen(false);

  const handleOpenPopover = async () => {
    setPopoverOpen(true);

    setIsLoading(true);
    const { data: result } = await fetchPullData();

    if (result.repositoryStatus === 'Ok') {
      onPullSuccess?.();
      await queryClient.invalidateQueries({
        predicate: (q) => {
          const queryKey = q.queryKey;
          return queryKey.includes(owner) && queryKey.includes(repoName);
        },
      });
    } else if (result.hasMergeConflict || result.repositoryStatus === 'CheckoutConflict') {
      await commitAndPushChanges('');
      setPopoverOpen(false);
    }
    setIsLoading(false);
  };

  return (
    <StudioPopover open={popoverOpen} onClose={handleClosePopover} placement='bottom-end'>
      <StudioPageHeader.PopoverTrigger
        onClick={handleOpenPopover}
        disabled={hasMergeConflict}
        icon={<DownloadIcon />}
        color='light'
        variant='regular'
        aria-label={t('sync_header.fetch_changes')}
      >
        {shouldDisplayText && t('sync_header.fetch_changes')}
        {displayNotification && <Notification numChanges={repoStatus?.behindBy ?? 0} />}
      </StudioPageHeader.PopoverTrigger>
      <StudioPopover.Content className={classes.popoverContent}>
        {isLoading && <SyncLoadingIndicator heading={t('sync_header.fetching_latest_version')} />}
        {!isLoading && <GiteaFetchCompleted heading={t('sync_header.service_updated_to_latest')} />}
      </StudioPopover.Content>
    </StudioPopover>
  );
};
