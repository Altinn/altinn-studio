import type { ReactElement } from 'react';
import cn from 'classnames';
import { StudioAvatar } from '@studio/components';
import classes from './ChatAvatar.module.css';
import assistantLogo from '../../../assets/altinity-logo.png';

export type ChatAvatarVariant = 'user' | 'assistant';

export type ChatAvatarProps = {
  src?: string;
  label: string;
  variant: ChatAvatarVariant;
};

export function ChatAvatar({ src, label, variant }: ChatAvatarProps): ReactElement {
  const isAssistant = variant === 'assistant';
  const variantClass = isAssistant ? classes.avatarAssistant : classes.avatarUser;
  const resolvedSrc = src ?? (isAssistant ? assistantLogo : undefined);

  return (
    <StudioAvatar
      src={resolvedSrc}
      alt={label}
      aria-label={label}
      title={label}
      className={cn(classes.avatar, variantClass)}
    />
  );
}
