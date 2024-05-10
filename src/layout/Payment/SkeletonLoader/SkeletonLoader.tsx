import React from 'react';

import { Heading, Skeleton } from '@digdir/designsystemet-react';

import classes from 'src/layout/Payment/SkeletonLoader/SkeletonLoader.module.css';

export const SkeletonLoader = () => (
  <div className={classes.skeletonWrapper}>
    <Skeleton.Rectangle
      width='100%'
      height='150px'
    />
    <div className={classes.titleContainer}>
      <Skeleton.Circle
        width='30px'
        height='30px'
      />
      <Heading
        asChild
        size='medium'
      >
        <Skeleton.Text>En medium tittel</Skeleton.Text>
      </Heading>
    </div>
    <Skeleton.Text width='100%' />
    <Skeleton.Text width='100%' />
    <Skeleton.Text width='80%' />
  </div>
);
