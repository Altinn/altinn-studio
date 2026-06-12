import type { ReactElement } from 'react';
import cn from 'classnames';
import { Messages } from './Messages/Messages';
import { PlaceholderMessage } from './PlaceholderMessage';
import type { UserFeedback } from '../../types/UserFeedback';
import { UserInput } from './UserInput/UserInput';
import classes from './MessageColumn.module.css';
import { StudioResizableLayout } from '@studio/components';
import type { Message } from '../../types/ChatThread';
import type { AssistantTexts } from '../../types/AssistantTexts';
import type { User } from '../../types/User';
import type { WorkflowStatus } from '../../types/WorkflowStatus';

export type MessageColumnProps = {
  texts: AssistantTexts;
  messages: Message[];
  onSubmitMessage: (message: Message) => void;
  onCancelWorkflow?: () => void;
  cancelledMessageContent?: string | null;
  onCancelledMessageConsumed?: () => void;
  onMessageFeedback?: (feedback: UserFeedback) => void;
  workflowStatus?: WorkflowStatus;
  enableCompactInterface: boolean;
  currentUser?: User;
};

export function MessageColumn({
  texts,
  messages,
  onSubmitMessage,
  onCancelWorkflow,
  cancelledMessageContent,
  onCancelledMessageConsumed,
  onMessageFeedback,
  workflowStatus,
  enableCompactInterface,
  currentUser,
}: MessageColumnProps): ReactElement {
  const workflowIsActive = workflowStatus?.isActive === true;
  const hasMessages = messages.length > 0;

  return (
    <StudioResizableLayout.Container orientation='vertical' localStorageContext='chat-column'>
      <StudioResizableLayout.Element minimumSize={100}>
        <div className={cn(classes.messagesWrapper, { [classes.hasMessages]: hasMessages })}>
          {hasMessages ? (
            <Messages
              messages={messages}
              assistantName={texts.heading}
              workflowStatus={workflowStatus}
              currentUser={currentUser}
              assistantAvatarUrl={undefined}
              feedbackTexts={texts.feedback}
              onMessageFeedback={onMessageFeedback}
            />
          ) : (
            <PlaceholderMessage texts={texts.emptyThread} />
          )}
        </div>
      </StudioResizableLayout.Element>
      <StudioResizableLayout.Element minimumSize={150} style={{ overflow: 'hidden' }}>
        <UserInput
          texts={texts}
          onSubmitMessage={onSubmitMessage}
          onCancelWorkflow={onCancelWorkflow}
          cancelledMessageContent={cancelledMessageContent}
          onCancelledMessageConsumed={onCancelledMessageConsumed}
          workflowIsActive={workflowIsActive}
          enableCompactInterface={enableCompactInterface}
        />
      </StudioResizableLayout.Element>
    </StudioResizableLayout.Container>
  );
}
