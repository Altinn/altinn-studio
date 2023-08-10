import React from 'react';
import { Button } from '@digdir/design-system-react';
import { UploadIcon, XMarkIcon } from '@navikt/aksel-icons';
import classes from './ShareChangesButton.module.css';
import { useTranslation } from 'react-i18next';
import { Notification } from '../Notification';

export interface IShareChangesButtonProps {
  changesInLocalRepo: boolean;
  hasMergeConflict: boolean;
  hasPushRight: boolean;
  shareChanges: any;
  displayNotification: boolean;
}

export const ShareChangesButton = ({
  changesInLocalRepo,
  hasMergeConflict,
  hasPushRight,
  shareChanges,
  displayNotification,
}: IShareChangesButtonProps) => {
  const { t } = useTranslation();

  const shareChangesHandler = (event: any) => shareChanges(event.currentTarget);

  const renderCorrectText = () => {
    if (hasMergeConflict) {
      return t('sync_header.merge_conflict');
    } else if (changesInLocalRepo) {
      return t('sync_header.changes_to_share');
    } else {
      return t('sync_header.no_changes_to_share');
    }
  };

  return (
    <Button
      className={classes.button}
      color='inverted'
      disabled={!hasPushRight}
      icon={hasMergeConflict ? <XMarkIcon /> : <UploadIcon />}
      id='share_changes_button'
      onClick={shareChangesHandler}
      size='small'
      variant='quiet'
      color='inverted'
    >
      {renderCorrectText()}
      {displayNotification && <Notification numChanges={1} />}
    </Button>
  );
};
