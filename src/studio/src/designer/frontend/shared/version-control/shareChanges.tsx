import React from 'react';
import { getLanguageFromKey } from '../utils/language';
import { Button, ButtonSize, ButtonVariant } from '@altinn/altinn-design-system';
import { Upload, Cancel } from '@navikt/ds-icons';
import classes from './versionControlHeader.module.css';

export interface IShareChangesComponentProps {
  buttonOnly?: boolean;
  changesInLocalRepo: boolean;
  hasMergeConflict: boolean;
  hasPushRight: boolean;
  language: any;
  shareChanges: any;
}

export const ShareChangesComponent = (props: IShareChangesComponentProps) => {
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
      onClick={shareChangesHandler}
      disabled={!props.hasPushRight}
      id='share_changes_button'
      svgIconComponent={props.hasMergeConflict ? <Cancel /> : <Upload />}
      variant={ButtonVariant.Quiet}
      size={ButtonSize.Small}
      className={classes.button}
    >
      {renderCorrectText()}
    </Button>
  );
};
