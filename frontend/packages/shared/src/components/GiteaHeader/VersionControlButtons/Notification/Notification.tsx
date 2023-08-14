import React from 'react';
import classes from './Notification.module.css';
import { Paragraph } from '@digdir/design-system-react';

interface Props {
  numChanges: number;
}

export const Notification = ({ numChanges }: Props) => {
  return (
    <div className={classes.wrapper}>
      <Paragraph size='xsmall' short className={classes.number}>
        {numChanges}
      </Paragraph>
    </div>
  );
};
