import React from 'react';
import type { ReactElement } from 'react';
import type { AssistantTexts, Message } from '../../types/AssistantConfig';
import { Messages } from './Messages/Messages';
import type { UserInputFlags } from './UserInput/UserInput';
import { UserInput } from './UserInput/UserInput';
import classes from './ChatColumn.module.css';
import { useUserQuery } from 'app-shared/hooks/queries';

export type ChatColumnProps = {
  texts: AssistantTexts;
  messages: Message[];
  onSubmitMessage: (message: Message) => void;
  flags: UserInputFlags;
};

export function ChatColumn({
  texts,
  messages,
  onSubmitMessage,
  flags,
}: ChatColumnProps): ReactElement {
  const { data: currentUser } = useUserQuery();

  return (
    <div className={classes.chatColumn}>
      <Messages messages={messages} currentUser={currentUser} assistantAvatarUrl={undefined} />
      <UserInput texts={texts} onSubmitMessage={onSubmitMessage} flags={flags} />
    </div>
  );
}
