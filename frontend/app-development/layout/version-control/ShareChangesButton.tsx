import React from 'react';
import { Button, ButtonSize, ButtonVariant } from '@digdir/design-system-react';
import { UploadIcon, XMarkIcon } from '@navikt/aksel-icons';
import classes from './FetchChangesButton.module.css';
import { useTranslation } from 'react-i18next';

export interface IShareChangesComponentProps {
  changesInLocalRepo: boolean;
  hasMergeConflict: boolean;
  hasPushRight: boolean;
  shareChanges: any;
}

export const ShareChangesButton = (props: IShareChangesComponentProps) => {
  const { t } = useTranslation();

  const shareChangesHandler = (event: any) => props.shareChanges(event.currentTarget);

  const renderCorrectText = () => {
    if (props.hasMergeConflict) {
      return t('sync_header.merge_conflict');
    } else if (props.changesInLocalRepo) {
      return t('sync_header.changes_to_share');
    } else {
      return t('sync_header.no_changes_to_share');
    }
  };

  return (
    <Button
      className={classes.button}
      disabled={!props.hasPushRight}
      icon={props.hasMergeConflict ? <XMarkIcon /> : <UploadIcon />}
      id='share_changes_button'
      onClick={shareChangesHandler}
      size={ButtonSize.Small}
      variant={ButtonVariant.Quiet}
    >
      {renderCorrectText()}
    </Button>
  );
};
