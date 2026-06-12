import type { ReactElement } from 'react';
import { StudioSpinner } from '@studio/components';
import { MessageRow } from '../MessageRow';
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
    <MessageRow label={assistantName} variant='assistant' avatarSrc={assistantAvatarUrl}>
      <div className={classes.assistantBody}>
        <StudioSpinner data-size='sm' className={classes.inlineSpinner} aria-hidden={true} />
        <div className={classes.loadingText}>{content}</div>
      </div>
    </MessageRow>
  );
}
