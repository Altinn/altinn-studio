import React from 'react';
import type { ReactElement } from 'react';
import type { Message } from '../../types/ChatThread';
import { Messages } from './Messages/Messages';
import type { UserInputFlags } from './UserInput/UserInput';
import { UserInput } from './UserInput/UserInput';
import classes from './ChatColumn.module.css';
import type { AssistantTexts } from '../../types/AssistantTexts';

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
