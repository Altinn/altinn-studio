import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';
import type { User } from '../../../types/User';
import { MessageAuthor } from '../../../types/MessageAuthor';
import classes from './Messages.module.css';
import type { Message } from '../../../types/ChatThread';
import type { MessageFeedbackTexts } from '../../../types/AssistantTexts';
import type { WorkflowStatus } from '../../../types/WorkflowStatus';
import type { UserFeedback } from '../../../types/UserFeedback';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import { AssistantLoadingBubble } from './AssistantLoadingBubble';

export type MessagesProps = {
  messages: Message[];
  assistantName: string;
  workflowStatus?: WorkflowStatus;
  currentUser?: User;
  assistantAvatarUrl?: string;
  feedbackTexts?: MessageFeedbackTexts;
  onMessageFeedback?: (feedback: UserFeedback) => void;
};

export function Messages({
  messages,
  assistantName,
  workflowStatus,
  currentUser,
  assistantAvatarUrl,
  feedbackTexts,
  onMessageFeedback,
}: MessagesProps): ReactElement {
  const showLoadingBubble = workflowStatus?.isActive === true;
  const loadingBubbleText = workflowStatus?.message ?? '';
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
            assistantName={assistantName}
            assistantAvatarUrl={assistantAvatarUrl}
            feedbackTexts={feedbackTexts}
            onMessageFeedback={onMessageFeedback}
          />
        ),
      )}
      {showLoadingBubble && (
        <AssistantLoadingBubble
          content={loadingBubbleText}
          assistantName={assistantName}
          assistantAvatarUrl={assistantAvatarUrl}
        />
      )}
    </div>
  );
}
