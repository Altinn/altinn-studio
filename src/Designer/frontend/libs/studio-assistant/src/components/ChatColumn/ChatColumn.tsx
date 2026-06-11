import type { ReactElement } from 'react';
import { useRef, useEffect } from 'react';
import cn from 'classnames';
import { Messages } from './Messages/Messages';
import type { UserFeedback } from '../../types/UserFeedback';
import { UserInput } from './UserInput/UserInput';
import classes from './ChatColumn.module.css';
import { StudioParagraph, StudioResizableLayout } from '@studio/components';
import type { Message } from '../../types/ChatThread';
import type { AssistantTexts } from '../../types/AssistantTexts';
import type { User } from '../../types/User';
import type { WorkflowStatus } from '../../types/WorkflowStatus';

export type ChatColumnProps = {
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

export function ChatColumn({
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
}: ChatColumnProps): ReactElement {
  const workflowIsActive = workflowStatus?.isActive === true;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView?.({ behavior: 'smooth' });
    }
  }, [messages, workflowIsActive]);

  const placeholderContent = (
    <div className={classes.emptyThread}>
      <div className={classes.emptyThreadIcon}>
        <span className={classes.bubble}>
          <span className={classes.dot}></span>
          <span className={classes.dot}></span>
          <span className={classes.dot}></span>
        </span>
      </div>
      <StudioParagraph data-size='lg'>{texts.emptyThread.welcome}</StudioParagraph>
      <StudioParagraph data-size='lg'>{texts.emptyThread.instruction}</StudioParagraph>
    </div>
  );

  const hasMessages = messages.length > 0;

  return (
    <StudioResizableLayout.Container orientation='vertical' localStorageContext='chat-column'>
      <StudioResizableLayout.Element minimumSize={100}>
        <div className={cn(classes.messagesWrapper, { [classes.hasMessages]: hasMessages })}>
          {hasMessages ? (
            <>
              <Messages
                messages={messages}
                workflowStatus={workflowStatus}
                currentUser={currentUser}
                assistantAvatarUrl={undefined}
              />
              <div ref={messagesEndRef} />
            </>
          ) : (
            placeholderContent
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
