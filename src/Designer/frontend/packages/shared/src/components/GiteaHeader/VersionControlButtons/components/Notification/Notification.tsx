import classes from './Notification.module.css';
import { StudioParagraph } from '@studio/components';
export type NotificationProps = {
  numChanges?: number;
};

export const Notification = ({ numChanges }: NotificationProps) => {
  return (
    <span className={classes.wrapper} aria-hidden aria-label={'sync_header.notification_label'}>
      <StudioParagraph>{numChanges}</StudioParagraph>
    </span>
  );
};
