import React, { useState } from 'react';
import { StudioButton, StudioPopover } from '@studio/components';
import { UploadIcon, XMarkIcon } from '@studio/icons';
import classes from './ShareChangesPopover.module.css';
import { useTranslation } from 'react-i18next';
import { Notification } from '../Notification';
import { GiteaFetchCompleted } from '../GiteaFetchCompleted';
import { useRepoStatusQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useVersionControlButtonsContext } from '../../context';
import { SyncLoadingIndicator } from '../SyncLoadingIndicator';
import type { IContentStatus, IGitStatus } from 'app-shared/types/global';
import { CommitAndPushContent } from './CommitAndPushContent';

export const ShareChangesPopover = () => {
  const { isLoading, setIsLoading, hasPushRights, hasMergeConflict, repoStatus } =
    useVersionControlButtonsContext();

  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { refetch: refetchRepoStatus } = useRepoStatusQuery(org, app);

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [hasChangesToPush, setHasChangesToPush] = useState(true);

  const fetchCompleted: boolean = !isLoading && !hasChangesToPush;
  const displayNotification: boolean =
    (repoStatus?.contentStatus?.length > 0 ?? false) && !hasMergeConflict;

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
    if (hasMergeConflict) {
      return t('sync_header.merge_conflict_title');
    }
    return t('sync_header.changes_to_share');
  };

  return (
    <StudioPopover open={popoverOpen} onClose={handleClosePopover} placement='bottom-end'>
      <StudioPopover.Trigger asChild>
        <StudioButton
          color='inverted'
          size='small'
          variant='tertiary'
          onClick={handleOpenPopover}
          disabled={!hasPushRights || hasMergeConflict}
          title={renderCorrectTitle()}
          icon={hasMergeConflict ? <XMarkIcon /> : <UploadIcon />}
        >
          {hasMergeConflict ? t('sync_header.merge_conflict') : t('sync_header.changes_to_share')}
          {displayNotification && <Notification numChanges={1} />}
        </StudioButton>
      </StudioPopover.Trigger>
      <StudioPopover.Content
        className={fetchCompleted ? classes.popoverContentCenter : classes.popoverContent}
      >
        {isLoading && (
          <SyncLoadingIndicator heading={t('sync_header.controlling_service_status')} />
        )}
        {!isLoading && hasChangesToPush && (
          <CommitAndPushContent handleClosePopover={handleClosePopover} />
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
