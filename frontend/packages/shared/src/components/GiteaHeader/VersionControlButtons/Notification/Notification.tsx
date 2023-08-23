import React from 'react';
import classes from './Notification.module.css';
import { Paragraph } from '@digdir/design-system-react';

type NotificationProps = {
  numChanges: number;
};

export const Notification = ({ numChanges }: NotificationProps) => {
  return (
    <div className={classes.wrapper}>
      <Paragraph size='xsmall' short className={classes.number}>
        {numChanges}
      </Paragraph>
    </div>
  );
};
