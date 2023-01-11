import React from 'react';
import { getLanguageFromKey } from '../utils/language';
import { Button, ButtonSize, ButtonVariant } from '@digdir/design-system-react';
import { Upload, Cancel } from '@navikt/ds-icons';
import classes from './VersionControlHeader.module.css';

export interface IShareChangesComponentProps {
  buttonOnly?: boolean;
  changesInLocalRepo: boolean;
  hasMergeConflict: boolean;
  hasPushRight: boolean;
  language: any;
  shareChanges: any;
}

export const ShareChangesButton = (props: IShareChangesComponentProps) => {
  const shareChangesHandler = (event: any) => {
    const noChanges = !props.changesInLocalRepo;
    props.shareChanges(event.currentTarget, noChanges);
  };
  const renderCorrectText = () => {
    if (props.hasMergeConflict) {
      return getLanguageFromKey('sync_header.merge_conflict', props.language);
    } else if (props.changesInLocalRepo) {
      return getLanguageFromKey('sync_header.changes_to_share', props.language);
    } else {
      return getLanguageFromKey('sync_header.no_changes_to_share', props.language);
    }
  };

  return (
    <Button
      className={classes.button}
      disabled={!props.hasPushRight}
      icon={props.hasMergeConflict ? <Cancel /> : <Upload />}
      id='share_changes_button'
      onClick={shareChangesHandler}
      size={ButtonSize.Small}
      variant={ButtonVariant.Quiet}
    >
      {renderCorrectText()}
    </Button>
  );
};
