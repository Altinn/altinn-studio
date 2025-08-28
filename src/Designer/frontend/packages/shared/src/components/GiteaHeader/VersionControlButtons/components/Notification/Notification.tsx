import React from 'react';
import classes from './Notification.module.css';
import { Paragraph } from '@digdir/designsystemet-react';

export type NotificationProps = {
  numChanges?: number;
};

export const Notification = ({ numChanges }: NotificationProps) => {
  return (
    <span className={classes.wrapper} aria-hidden aria-label={'sync_header.notification_label'}>
      <Paragraph asChild size='xsmall' variant='short' className={classes.number}>
        <span>{numChanges}</span>
      </Paragraph>
    </span>
  );
};
