import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import type { User } from '../../../types/User';
import { MessageAuthor } from '../../../types/MessageAuthor';
import classes from './Messages.module.css';
import type { Message } from '../../../types/ChatThread';
import type { AssistantTexts } from '../../../types/AssistantTexts';
import type { WorkflowStatus, TrailStep } from '../../../types/WorkflowStatus';
import type { UserFeedback } from '../../../types/UserFeedback';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import { AssistantLoadingBubble } from './AssistantLoadingBubble';

export type MessagesProps = {
  messages: Message[];
  texts: AssistantTexts;
  workflowStatus?: WorkflowStatus;
  currentUser?: User;
  assistantAvatarUrl?: string;
  onMessageFeedback?: (feedback: UserFeedback) => void;
};

export function Messages({
  messages,
  texts,
  workflowStatus,
  currentUser,
  assistantAvatarUrl,
  onMessageFeedback,
}: MessagesProps): ReactElement {
  const showLoadingBubble = workflowStatus?.isActive === true;
  const trailSteps = resolveTrailSteps(workflowStatus);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    container?.scrollTo?.({ top: container.scrollHeight, behavior: 'smooth' });
  }, [messages, showLoadingBubble]);

  return (
    <div ref={containerRef} className={classes.messagesContainer}>
      {messages.map((message, index) =>
        message.role === MessageAuthor.User ? (
          <UserMessage key={index} message={message} currentUser={currentUser} />
        ) : (
          <AssistantMessage
            key={index}
            message={message}
            texts={texts}
            assistantAvatarUrl={assistantAvatarUrl}
            onMessageFeedback={onMessageFeedback}
          />
        ),
      )}
      {showLoadingBubble && (
        <AssistantLoadingBubble
          steps={trailSteps}
          assistantName={texts.heading}
          assistantAvatarUrl={assistantAvatarUrl}
        />
      )}
    </div>
  );
}

/**
 * Callers that only set `message` (no `steps[]`) still get a single step
 * rendered so the trail bubble doesn't appear empty — keeps the component
 * robust against partial state.
 */
function resolveTrailSteps(workflowStatus: WorkflowStatus | undefined): TrailStep[] {
  if (!workflowStatus) return [];
  if (workflowStatus.steps && workflowStatus.steps.length > 0) {
    return workflowStatus.steps;
  }
  if (workflowStatus.message) {
    return [{ id: 'legacy', message: workflowStatus.message, offsetMs: 0 }];
  }
  return [];
}
