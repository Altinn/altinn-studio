import React from 'react';
import type { ReactElement } from 'react';
import type { AssistantTexts, Message } from '../../types/AssistantConfig';
import { Messages } from './Messages/Messages';
import { UserInput } from './UserInput/UserInput';
import classes from './ChatColumn.module.css';

export type ChatColumnProps = {
  texts: AssistantTexts;
  messages: Message[];
  onSubmitMessage: (message: Message) => void;
};

export function ChatColumn({ texts, messages, onSubmitMessage }: ChatColumnProps): ReactElement {
  return (
    <div className={classes.chatColumn}>
      <Messages messages={messages} />
      <UserInput texts={texts} onSubmitMessage={onSubmitMessage} />
    </div>
  );
}
