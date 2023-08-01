import React from 'react';
import { Button } from '@digdir/design-system-react';
import { DownloadIcon } from '@navikt/aksel-icons';
import classes from './FetchChangesButton.module.css';

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
      icon={<DownloadIcon />}
      onClick={fetchChangesHandler}
      size='small'
      variant='quiet'
      color='inverted'
    >
      <span id='fetch_changes_btn'>{buttonText}</span>
    </Button>
  );
};
