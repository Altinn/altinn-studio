import React from 'react';
import { StudioButton } from '@studio/components';
import { DownloadIcon } from '@navikt/aksel-icons';
import classes from './FetchChangesButton.module.css';
import { useTranslation } from 'react-i18next';
import { Notification } from '../Notification';

export interface IFetchChangesButtonProps {
  fetchChanges: any;
  displayNotification: boolean;
  numChanges: number;
}

export const FetchChangesButton = ({
  fetchChanges,
  displayNotification,
  numChanges,
}: IFetchChangesButtonProps) => {
  const { t } = useTranslation();

  const fetchChangesHandler = (event: any) => fetchChanges(event.currentTarget);

  return (
    <StudioButton
      className={classes.button}
      color='inverted'
      icon={<DownloadIcon />}
      onClick={fetchChangesHandler}
      size='small'
      variant='tertiary'
    >
      {t('sync_header.fetch_changes')}
      {displayNotification && <Notification numChanges={numChanges} />}
    </StudioButton>
  );
};
