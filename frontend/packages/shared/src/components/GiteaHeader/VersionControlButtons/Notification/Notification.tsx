import React from 'react';
import classes from './Notification.module.css';
import { Paragraph } from '@digdir/design-system-react';

type NotificationProps = {
  numChanges: number;
};

export const Notification = ({ numChanges }: NotificationProps) => {
  return (
    <span className={classes.wrapper} aria-hidden>
      <Paragraph asChild size='xsmall' short className={classes.number}>
        <span>{numChanges}</span>
      </Paragraph>
    </span>
  );
};
