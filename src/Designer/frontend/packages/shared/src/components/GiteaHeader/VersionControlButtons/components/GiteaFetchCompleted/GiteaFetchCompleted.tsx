import React from 'react';
import classes from './GiteaFetchCompleted.module.css';
import { Heading } from '@digdir/designsystemet-react';
import { CheckmarkCircleIcon } from 'libs/studio-icons/src';

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
