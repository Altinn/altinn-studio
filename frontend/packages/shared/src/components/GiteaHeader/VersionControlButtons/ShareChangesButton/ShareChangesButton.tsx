import React, { useState } from 'react';
import { StudioButton, StudioPopover, StudioSpinner, StudioTextarea } from '@studio/components';
import { UploadIcon, XMarkIcon } from '@studio/icons';
import classes from './ShareChangesButton.module.css';
import { useTranslation } from 'react-i18next';
import { Notification } from '../Notification';
import { Heading, Paragraph } from '@digdir/design-system-react';
import { GiteaFetchCompleted } from '../GiteaFetchCompleted';

export interface IShareChangesButtonProps {
  hasMergeConflict: boolean;
  hasPushRight: boolean;
  shareChanges: any;
  displayNotification: boolean;
}

export const ShareChangesButton = ({
  hasMergeConflict,
  hasPushRight,
  shareChanges,
  displayNotification,
}: IShareChangesButtonProps) => {
  const { t } = useTranslation();

  const shareChangesHandler = (event: any) => shareChanges(event.currentTarget);

  const renderCorrectTitle = () => {
    if (!hasPushRight) {
      return t('sync_header.sharing_changes_no_access');
    }
    if (hasMergeConflict) {
      return t('sync_header.merge_conflict_title');
    }
    return t('sync_header.changes_to_share');
  };

  return (
    <StudioButton
      className={classes.button}
      title={renderCorrectTitle()}
      color='inverted'
      disabled={!hasPushRight || hasMergeConflict}
      icon={hasMergeConflict ? <XMarkIcon /> : <UploadIcon />}
      id='share_changes_button'
      onClick={shareChangesHandler}
      size='small'
      variant='tertiary'
    >
      {hasMergeConflict ? t('sync_header.merge_conflict') : t('sync_header.changes_to_share')}
      {displayNotification && !hasMergeConflict && <Notification numChanges={1} />}
    </StudioButton>
  );
};

export type ShareChangesProps = {
  hasMergeConflict: boolean; // context
  handleMergeConflict: (message: string) => Promise<void>; // context
  handleCommitAndPush: (message: string) => Promise<void>;
  hasPushRight: boolean;
  shareChanges: any;
  displayNotification: boolean;
};

export const ShareChanges = ({
  hasMergeConflict,
  hasPushRight,
  shareChanges,
  displayNotification,
  handleCommitAndPush,
}: ShareChangesProps) => {
  const { t } = useTranslation();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasChangesToPush, setHasChangesToPush] = useState(true);

  const handleClosePopover = () => setPopoverOpen(false);

  const handleOpenPopover = () => {
    setPopoverOpen(true);
  };

  const renderCorrectTitle = () => {
    if (!hasPushRight) {
      return t('sync_header.sharing_changes_no_access');
    }
    if (hasMergeConflict) {
      return t('sync_header.merge_conflict_title');
    }
    return t('sync_header.changes_to_share');
  };

  return (
    <StudioPopover open={popoverOpen} onClose={handleClosePopover} placement='bottom'>
      <StudioPopover.Trigger
        color='inverted'
        size='small'
        variant='tertiary'
        onClick={handleOpenPopover}
        disabled={!hasPushRight || hasMergeConflict}
        title={renderCorrectTitle()}
      >
        {hasMergeConflict ? <XMarkIcon /> : <UploadIcon />}
        {hasMergeConflict ? t('sync_header.merge_conflict') : t('sync_header.changes_to_share')}
        {displayNotification && !hasMergeConflict && <Notification numChanges={1} />}
      </StudioPopover.Trigger>
      <StudioPopover.Content className={classes.popoverContent}>
        {loading && <FetchingFromGitea />}
        {!loading && hasChangesToPush && (
          <CommitAndPushContent onClickCommitAndPush={handleCommitAndPush} />
        )}
        {!loading && !hasChangesToPush && (
          <GiteaFetchCompleted heading={t('sync_header.nothing_to_push')} />
        )}
        {/*
        {!loading && <GiteaFetchCompleted heading={t('sync_header.service_updated_to_latest')} />}
        */}
      </StudioPopover.Content>
    </StudioPopover>
  );
};

// States
// - Loading
// - Loading complete - No changes to share
// - Loading complete - changes to share
// -

const FetchingFromGitea = () => {
  const { t } = useTranslation();

  return (
    <>
      <Heading size='xxsmall' spacing level={3}>
        {t('sync_header.fetching_latest_version')}
      </Heading>
      <StudioSpinner showSpinnerTitle={false} spinnerTitle={t('sync_modal.loading')} />
    </>
  );
};

type CommitAndPushContentProps = {
  onClickCommitAndPush: (message: string) => Promise<void>;
};
const CommitAndPushContent = ({ onClickCommitAndPush }: CommitAndPushContentProps) => {
  const { t } = useTranslation();
  const [commitMessage, setCommitMessage] = useState('');

  const handleClickCommitAndPush = () => {
    onClickCommitAndPush(commitMessage);
  };

  const handleTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCommitMessage(event.target.value);
  };

  return (
    <>
      <Heading size='xxsmall' className={classes.heading} level={3}>
        {t('sync_header.describe_and_validate')}
      </Heading>
      <Paragraph size='small' spacing>
        {t('sync_header.describe_and_validate_sub_message')}
      </Paragraph>
      <Paragraph size='small' spacing>
        {t('sync_header.describe_and_validate_sub_sub_message')}
      </Paragraph>
      <StudioTextarea
        label={t('sync_header.describe_changes_made')}
        value={commitMessage}
        onChange={handleTextareaChange}
        rows={4}
      />
      <StudioButton
        variant='primary'
        color='first'
        onClick={handleClickCommitAndPush}
        id='share_changes_modal_button'
        size='small'
        fullWidth
        className={classes.commitAndPushButton}
      >
        {t('sync_header.describe_and_validate_btnText')}
      </StudioButton>
    </>
  );
};
