import React, { useRef, useEffect } from 'react';
import type { ReactElement } from 'react';
import cn from 'classnames';
import { Messages } from './Messages/Messages';
import { UserInput } from './UserInput/UserInput';
import classes from './ChatColumn.module.css';
import { StudioParagraph } from '@studio/components';
import type { Message, UserMessage } from '../../types/ChatThread';
import type { AssistantTexts } from '../../types/AssistantTexts';
import type { User } from '../../types/User';

export type ChatColumnProps = {
  texts: AssistantTexts;
  messages: Message[];
  onSubmitMessage: (message: UserMessage) => void;
  enableCompactInterface: boolean;
  currentUser?: User;
};

export function ChatColumn({
  texts,
  messages,
  onSubmitMessage,
  enableCompactInterface,
  currentUser,
}: ChatColumnProps): ReactElement {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView?.({ behavior: 'smooth' });
    }
  }, [messages]);
  const placeholderContent = (
    <div className={classes.emptyState}>
      <div className={classes.emptyStateIcon}>
        <span className={classes.bubble}>
          <span className={classes.dot}></span>
          <span className={classes.dot}></span>
          <span className={classes.dot}></span>
        </span>
      </div>
      <StudioParagraph data-size='lg'>
        Velkommen til Altinity!
        <br /> Skriv i feltet under for å begynne.
      </StudioParagraph>
    </div>
  );

  const hasMessages = messages.length > 0;

  return (
    <div className={classes.chatColumn}>
      <div className={cn(classes.messagesWrapper, { [classes.hasMessages]: hasMessages })}>
        {hasMessages ? (
          <>
            <Messages
              messages={messages}
              currentUser={currentUser}
              assistantAvatarUrl={undefined}
            />
            <div ref={messagesEndRef} />
          </>
        ) : (
          placeholderContent
        )}
      </div>
      <UserInput
        texts={texts}
        onSubmitMessage={onSubmitMessage}
        enableCompactInterface={enableCompactInterface}
      />
    </div>
  );
}
