import React, { useState } from 'react';
import { StudioButton, StudioPopover } from '@studio/components';
import { UploadIcon } from '@studio/icons';
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
import type { RepoContentStatus } from 'app-shared/types/RepoStatus';

export const ShareChangesPopover = () => {
  const { isLoading, setIsLoading, hasPushRights, hasMergeConflict, repoStatus } =
    useVersionControlButtonsContext();

  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { refetch: refetchRepoStatus } = useRepoStatusQuery(org, app);

  const [popoverHidden, setPopoverHidden] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [hasChangesToPush, setHasChangesToPush] = useState(true);

  const fetchCompleted: boolean = !isLoading && !hasChangesToPush;
  const displayNotification: boolean =
    (repoStatus?.contentStatus?.length > 0 ?? false) && !hasMergeConflict;

  const fileChanges: RepoContentStatus[] = repoStatus?.contentStatus;

  const handleHidePopover = (hide: boolean) => setPopoverHidden(hide);
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
    <div>
      <StudioButton
        color='inverted'
        variant='tertiary'
        onClick={handleOpenPopover}
        disabled={!hasPushRights || hasMergeConflict}
        title={renderCorrectTitle()}
        icon={<UploadIcon />}
      >
        {t('sync_header.changes_to_share')}
        {displayNotification && <Notification />}
      </StudioButton>
      <div className={popoverHidden ? classes.hidePopover : classes.showPopover}>
        <StudioPopover open={popoverOpen} onClose={handleClosePopover} placement='bottom-end'>
          <StudioPopover.Trigger asChild>
            <span />
          </StudioPopover.Trigger>
          <StudioPopover.Content
            className={fetchCompleted ? classes.popoverContentCenter : classes.popoverContent}
          >
            {isLoading && (
              <SyncLoadingIndicator heading={t('sync_header.controlling_service_status')} />
            )}
            {!isLoading && hasChangesToPush && (
              <CommitAndPushContent
                onHidePopover={handleHidePopover}
                onClosePopover={handleClosePopover}
                fileChanges={fileChanges}
              />
            )}
            {fetchCompleted && <GiteaFetchCompleted heading={t('sync_header.nothing_to_push')} />}
          </StudioPopover.Content>
        </StudioPopover>
      </div>
    </div>
  );
};

const hasLocalChanges = (result: IGitStatus) => {
  return (
    result && result.contentStatus.some((file: IContentStatus) => file.fileStatus !== 'Ignored')
  );
};
