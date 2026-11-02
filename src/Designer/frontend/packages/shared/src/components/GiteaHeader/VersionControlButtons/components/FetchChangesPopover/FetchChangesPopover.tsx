import React, { useState } from 'react';
import { useMediaQuery } from '@studio/hooks';
import { StudioBadge, StudioPopover } from '@studio/components';
import { DownloadIcon } from '@studio/icons';
import classes from './FetchChangesPopover.module.css';
import { useTranslation } from 'react-i18next';
import { GiteaFetchCompleted } from '../GiteaFetchCompleted';
import { useVersionControlButtonsContext } from '../../context';
import { SyncLoadingIndicator } from '../SyncLoadingIndicator';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';

export const FetchChangesPopover = (): React.ReactElement => {
  const { isLoading, setIsLoading, hasMergeConflict, repoStatus, fetchChanges } =
    useVersionControlButtonsContext();

  const { t } = useTranslation();
  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);

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
    const isUpToDate = await fetchChanges();
    if (!isUpToDate) setPopoverOpen(false);
    setIsLoading(false);
  };

  return (
    <StudioPopover.TriggerContext>
      <StudioPopover.Trigger
        className={classes.fetchButton}
        onClick={handleOpenPopover}
        disabled={hasMergeConflict}
        icon={<DownloadIcon />}
        variant='tertiary'
        aria-label={t('sync_header.fetch_changes')}
        title={t('sync_header.fetch_changes')}
      >
        {shouldDisplayText && t('sync_header.fetch_changes')}
        {displayNotification && (
          <StudioBadge
            data-color='danger'
            data-size='md'
            role='status'
            data-count={repoStatus?.behindBy}
          />
        )}
      </StudioPopover.Trigger>
      {popoverOpen && (
        <StudioPopover
          open={popoverOpen}
          onClose={handleClosePopover}
          placement='bottom-end'
          data-color-scheme='light'
          className={classes.popoverContent}
        >
          {isLoading && <SyncLoadingIndicator heading={t('sync_header.fetching_latest_version')} />}
          {!isLoading && (
            <GiteaFetchCompleted heading={t('sync_header.service_updated_to_latest')} />
          )}
        </StudioPopover>
      )}
    </StudioPopover.TriggerContext>
  );
};
