import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import cn from 'classnames';
import type { AssistantTexts, Message } from '../../types/AssistantConfig';
import { Messages } from './Messages/Messages';
import type { UserInputFlags } from './UserInput/UserInput';
import { UserInput } from './UserInput/UserInput';
import classes from './ChatColumn.module.css';
import { useUserQuery } from 'app-shared/hooks/queries';
import { StudioHeading, StudioParagraph } from '@studio/components';

export type ChatColumnProps = {
  texts: AssistantTexts;
  messages: Message[];
  onSubmitMessage: (message: Message) => void;
  flags: UserInputFlags;
  emptyPlaceholder?: ReactNode;
};

export function ChatColumn({
  texts,
  messages,
  onSubmitMessage,
  flags,
  emptyPlaceholder,
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
      {/* <StudioHeading level={3} data-size='md' data-color='primary'>
        Altinny
      </StudioHeading> */}
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
      <UserInput texts={texts} onSubmitMessage={onSubmitMessage} flags={flags} />
    </div>
  );
}
