import React, { useState } from 'react';
import { StudioPageHeader, StudioPopover, useMediaQuery } from '@studio/components';
import { UploadIcon } from '@studio/icons';
import classes from './ShareChangesPopover.module.css';
import { useTranslation } from 'react-i18next';
import { Notification } from '../Notification';
import { GiteaFetchCompleted } from '../GiteaFetchCompleted';
import { useRepoStatusQuery } from 'app-shared/hooks/queries';
import { useVersionControlButtonsContext } from '../../context';
import { SyncLoadingIndicator } from '../SyncLoadingIndicator';
import type { IContentStatus, IGitStatus } from 'app-shared/types/global';
import { CommitAndPushContent } from './CommitAndPushContent';
import type { RepoContentStatus } from 'app-shared/types/RepoStatus';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { useGiteaHeaderContext } from '../../context/GiteaHeaderContext';

export const ShareChangesPopover = () => {
  const { isLoading, setIsLoading, hasPushRights, hasMergeConflict, repoStatus } =
    useVersionControlButtonsContext();

  const { t } = useTranslation();
  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);

  const { owner, repoName } = useGiteaHeaderContext();
  const { refetch: refetchRepoStatus } = useRepoStatusQuery(owner, repoName);

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [hasChangesToPush, setHasChangesToPush] = useState(true);

  const fetchCompleted: boolean = !isLoading && !hasChangesToPush;
  const displayNotification: boolean =
    repoStatus?.contentStatus && repoStatus?.contentStatus?.length > 0 && !hasMergeConflict;

  const fileChanges: RepoContentStatus[] = repoStatus?.contentStatus;

  const handleClosePopover = () => setPopoverOpen(false);

  const handleOpenPopover = async () => {
    setPopoverOpen(true);
    setIsLoading(true);

    const { data: repoStatusResult } = await refetchRepoStatus();
    if (repoStatusResult) {
      setIsLoading(false);

      if (!hasLocalChanges(repoStatusResult) && repoStatusResult.aheadBy === 0) {
        setHasChangesToPush(false);
      } else {
        setHasChangesToPush(true);
      }
    }
  };

  const renderCorrectTitle = () => {
    if (!hasPushRights) {
      return t('sync_header.sharing_changes_no_access');
    }
    return t('sync_header.changes_to_share');
  };

  return (
    <StudioPopover open={popoverOpen} onClose={handleClosePopover} placement='bottom-end'>
      <StudioPageHeader.PopoverTrigger
        onClick={handleOpenPopover}
        disabled={!hasPushRights || hasMergeConflict}
        title={renderCorrectTitle()}
        icon={<UploadIcon />}
        color='light'
        variant='regular'
        aria-label={t('sync_header.changes_to_share')}
      >
        {shouldDisplayText && t('sync_header.changes_to_share')}
        {displayNotification && <Notification />}
      </StudioPageHeader.PopoverTrigger>
      <StudioPopover.Content
        className={fetchCompleted ? classes.popoverContentCenter : classes.popoverContent}
      >
        {isLoading && (
          <SyncLoadingIndicator heading={t('sync_header.controlling_service_status')} />
        )}
        {!isLoading && hasChangesToPush && (
          <CommitAndPushContent onClosePopover={handleClosePopover} fileChanges={fileChanges} />
        )}
        {fetchCompleted && <GiteaFetchCompleted heading={t('sync_header.nothing_to_push')} />}
      </StudioPopover.Content>
    </StudioPopover>
  );
};

const hasLocalChanges = (result: IGitStatus) => {
  return (
    result && result.contentStatus.some((file: IContentStatus) => file.fileStatus !== 'Ignored')
  );
};
