import React from 'react';
import classes from './GiteaFetchCompleted.module.css';
import { Heading } from '@digdir/design-system-react';
import { CheckmarkCircleIcon } from '@studio/icons';

export type GiteaFetchCompletedProps = {
  heading: string;
};

export const GiteaFetchCompleted = ({ heading }: GiteaFetchCompletedProps): React.ReactElement => {
  return (
    <>
      <Heading size='xxsmall' level={3}>
        {heading}
      </Heading>
      <CheckmarkCircleIcon className={classes.icon} />
    </>
  );
};
