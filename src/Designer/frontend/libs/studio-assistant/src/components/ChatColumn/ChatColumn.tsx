import React from 'react';
import type { ReactElement } from 'react';
import type { Message } from '../../types/ChatThread';
import { Messages } from './Messages/Messages';
import { UserInput } from './UserInput/UserInput';
import classes from './ChatColumn.module.css';
import type { AssistantProps } from '../../Assistant/Assistant';

export type ChatColumnProps = Pick<
  AssistantProps,
  'texts' | 'onSubmitMessage' | 'enableCompactInterface'
> & {
  messages: Message[];
};

export function ChatColumn({
  texts,
  messages,
  onSubmitMessage,
  enableCompactInterface,
}: ChatColumnProps): ReactElement {
  return (
    <div className={classes.chatColumn}>
      <Messages messages={messages} />
      <UserInput
        texts={texts}
        onSubmitMessage={onSubmitMessage}
        enableCompactInterface={enableCompactInterface}
      />
    </div>
  );
}
