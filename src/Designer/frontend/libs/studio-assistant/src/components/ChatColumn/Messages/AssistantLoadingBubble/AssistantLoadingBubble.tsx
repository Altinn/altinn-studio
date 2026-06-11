import type { ReactElement } from 'react';
import { StudioSpinner } from '@studio/components';
import { ChatAvatar } from '../../ChatAvatar';
import classes from './AssistantLoadingBubble.module.css';

export type AssistantLoadingBubbleProps = {
  content: string;
  assistantName: string;
  assistantAvatarUrl?: string;
};

export function AssistantLoadingBubble({
  content,
  assistantName,
  assistantAvatarUrl,
}: AssistantLoadingBubbleProps): ReactElement {
  return (
    <div className={classes.assistantRow}>
      <ChatAvatar src={assistantAvatarUrl} label={assistantName} variant='assistant' />
      <div className={classes.assistantMessage}>
        <div className={classes.messageMeta}>{assistantName}</div>
        <div className={classes.assistantBody}>
          <StudioSpinner data-size='sm' className={classes.inlineSpinner} aria-hidden={true} />
          <div className={classes.loadingText}>{content}</div>
        </div>
      </div>
    </div>
  );
}
