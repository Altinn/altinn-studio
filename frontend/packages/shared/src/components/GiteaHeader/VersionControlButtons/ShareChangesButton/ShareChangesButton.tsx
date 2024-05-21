import React from 'react';
import { StudioButton } from '@studio/components';
import { UploadIcon, XMarkIcon } from '@studio/icons';
import classes from './ShareChangesButton.module.css';
import { useTranslation } from 'react-i18next';
import { Notification } from '../Notification';

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
