import React from 'react';
import { Button, ButtonSize, ButtonVariant } from '@digdir/design-system-react';
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
      className={classes.button}
      data-testid='fetch-changes-button'
      icon={<Download />}
      onClick={fetchChangesHandler}
      size={ButtonSize.Small}
      variant={ButtonVariant.Quiet}
    >
      <span id='fetch_changes_btn'>{buttonText}</span>
    </Button>
  );
};
