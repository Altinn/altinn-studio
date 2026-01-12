import React from 'react';
import classes from './GiteaFetchCompleted.module.css';
import { CheckmarkCircleIcon } from '@studio/icons';
import { StudioHeading } from '@studio/components';

export type GiteaFetchCompletedProps = {
  heading: string;
};

export const GiteaFetchCompleted = ({ heading }: GiteaFetchCompletedProps): React.ReactElement => {
  return (
    <div className={classes.container}>
      <StudioHeading data-size='2xs' spacing level={3}>
        {heading}
      </StudioHeading>
      <CheckmarkCircleIcon className={classes.icon} />
    </div>
  );
};
