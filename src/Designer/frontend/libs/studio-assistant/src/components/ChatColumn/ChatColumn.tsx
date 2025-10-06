import React from 'react';
import type { ReactElement } from 'react';
import type { Message } from '../../types/AssistantConfig';
import { Messages } from './Messages/Messages';
import { UserInput } from './UserInput/UserInput';
import classes from './ChatColumn.module.css';

export type ChatColumnProps = {
  messages: Message[];
  onSendMessage: (message: Message) => void;
  sendButtonText: string;
  allowEditing?: boolean;
  onModeChange?: (mode: boolean) => void;
  textareaPlaceholder?: string;
};

export function ChatColumn({
  messages,
  onSendMessage,
  sendButtonText,
  allowEditing: selectedMode,
  onModeChange,
  textareaPlaceholder,
}: ChatColumnProps): ReactElement {
  return (
    <div className={classes.chatColumn}>
      <Messages messages={messages} />
      <UserInput
        onSendMessage={onSendMessage}
        sendButtonText={sendButtonText}
        selectedMode={selectedMode}
        onModeChange={onModeChange}
        textareaPlaceholder={textareaPlaceholder}
      />
    </div>
  );
}
