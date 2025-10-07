import React from 'react';
import type { ReactElement } from 'react';
import type { AssistantTexts, Message } from '../../types/AssistantConfig';
import { Messages } from './Messages/Messages';
import type { UserInputFlags } from './UserInput/UserInput';
import { UserInput } from './UserInput/UserInput';
import classes from './ChatColumn.module.css';

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
  return (
    <div className={classes.chatColumn}>
      <Messages messages={messages} />
      <UserInput texts={texts} onSubmitMessage={onSubmitMessage} flags={flags} />
    </div>
  );
}
