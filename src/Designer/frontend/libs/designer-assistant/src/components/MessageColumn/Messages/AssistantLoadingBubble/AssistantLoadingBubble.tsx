import type { ReactElement } from 'react';
import type { TrailStep } from '../../../../types/WorkflowStatus';
import { MessageRow } from '../MessageRow';
import { ActivityTrail } from '../ActivityTrail';

export type AssistantLoadingBubbleProps = {
  steps: TrailStep[];
  assistantName: string;
  assistantAvatarUrl?: string;
};

export function AssistantLoadingBubble({
  steps,
  assistantName,
  assistantAvatarUrl,
}: AssistantLoadingBubbleProps): ReactElement {
  return (
    <MessageRow label={assistantName} variant='assistant' avatarSrc={assistantAvatarUrl}>
      <ActivityTrail steps={steps} />
    </MessageRow>
  );
}
