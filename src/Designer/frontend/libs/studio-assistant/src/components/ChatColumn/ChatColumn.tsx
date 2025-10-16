import React from 'react';
import type { ReactElement } from 'react';
import cn from 'classnames';
import { Messages } from './Messages/Messages';
import { UserInput } from './UserInput/UserInput';
import classes from './ChatColumn.module.css';
import { useUserQuery } from 'app-shared/hooks/queries';
import { StudioParagraph } from '@studio/components';
import type { Message } from '../../types/ChatThread';
import type { AssistantTexts } from '../../types/AssistantTexts';

export type ChatColumnProps = {
  texts: AssistantTexts;
  messages: Message[];
  onSubmitMessage: (message: Message) => void;
  enableCompactInterface: boolean;
};

export function ChatColumn({
  texts,
  messages,
  onSubmitMessage,
  enableCompactInterface,
}: ChatColumnProps): ReactElement {
  const { data: currentUser } = useUserQuery();
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
        Her var det tomt.
        <br /> La oss starte et skjemaeventyr sammen 💌
      </StudioParagraph>
    </div>
  );

  const hasMessages = messages.length > 0;

  return (
    <div className={classes.chatColumn}>
      <div className={cn(classes.messagesWrapper, { [classes.hasMessages]: hasMessages })}>
        {hasMessages ? (
          <Messages messages={messages} currentUser={currentUser} assistantAvatarUrl={undefined} />
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
