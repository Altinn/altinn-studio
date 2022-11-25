import React from 'react';
import { Button, ButtonSize, ButtonVariant } from '@altinn/altinn-design-system';
import { Download } from '@navikt/ds-icons';
import classes from './VersionControlHeader.module.css';

export interface IFetchChangesComponentProps {
  changesInMaster: boolean;
  fetchChanges: any;
  buttonText: string;
}

export const FetchChangesButton = ({ fetchChanges, buttonText }: IFetchChangesComponentProps) => {
  const fetchChangesHandler = (event: any) => fetchChanges(event.currentTarget);
  return (
    <Button
      onClick={fetchChangesHandler}
      data-testid='fetch-changes-button'
      svgIconComponent={<Download />}
      variant={ButtonVariant.Quiet}
      size={ButtonSize.Small}
      className={classes.button}
    >
      <span id='fetch_changes_btn'>{buttonText}</span>
    </Button>
  );
};
