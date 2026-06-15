import type { ReactElement, ReactNode } from 'react';
import cn from 'classnames';
import { ChatAvatar, type ChatAvatarVariant } from '../ChatAvatar';
import classes from './MessageRow.module.css';

export type MessageRowProps = {
  label: string;
  variant: ChatAvatarVariant;
  avatarSrc?: string;
  children: ReactNode;
};

export function MessageRow({ label, variant, avatarSrc, children }: MessageRowProps): ReactElement {
  return (
    <div className={cn(classes.row, classes[variant])}>
      <ChatAvatar src={avatarSrc} label={label} variant={variant} />
      <div className={classes.content}>
        <div className={classes.meta}>{label}</div>
        {children}
      </div>
    </div>
  );
}
