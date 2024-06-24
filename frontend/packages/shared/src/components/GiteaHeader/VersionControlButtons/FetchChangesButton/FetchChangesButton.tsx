import React from 'react';
import { StudioButton } from '@studio/components';
import { DownloadIcon } from '@studio/icons';
import classes from './FetchChangesButton.module.css';
import { useTranslation } from 'react-i18next';
import { Notification } from '../Notification';

export interface IFetchChangesButtonProps {
  fetchChanges: any;
  hasMergeConflict: boolean;
  displayNotification: boolean;
  numChanges: number;
}

export const FetchChangesButton = ({
  fetchChanges,
  hasMergeConflict,
  displayNotification,
  numChanges,
}: IFetchChangesButtonProps) => {
  const { t } = useTranslation();

  const fetchChangesHandler = ({ currentTarget }: React.MouseEvent<HTMLButtonElement>) =>
    fetchChanges(currentTarget);

  return (
    <StudioButton
      className={classes.button}
      color='inverted'
      disabled={hasMergeConflict}
      icon={<DownloadIcon />}
      onClick={fetchChangesHandler}
      size='small'
      variant='tertiary'
    >
      {t('sync_header.fetch_changes')}
      {displayNotification && !hasMergeConflict && <Notification numChanges={numChanges} />}
    </StudioButton>
  );
};
