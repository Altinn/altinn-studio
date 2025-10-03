import React from 'react';
import type { ReactElement } from 'react';
import type { Message } from '../../types/AssistantConfig';
import type { ModeOption } from '../../types/ChatThread';
import { Messages } from './Messages/Messages';
import { UserInput } from './UserInput/UserInput';
import classes from './ChatColumn.module.css';

export type ChatColumnProps = {
  messages: Message[];
  onSendMessage: (message: Message) => void;
  sendButtonText: string;
  modeOptions?: ModeOption[];
  selectedMode?: string;
  onModeChange?: (mode: string) => void;
  textareaPlaceholder?: string;
};

export function ChatColumn({
  messages,
  onSendMessage,
  sendButtonText,
  modeOptions,
  selectedMode,
  onModeChange,
  textareaPlaceholder,
}: ChatColumnProps): ReactElement {
  return (
    <div className={classes.chatColumn}>
      <Messages messages={messages} />
      <UserInput
        onSendMessage={onSendMessage}
        sendButtonText={sendButtonText}
        modeOptions={modeOptions}
        selectedMode={selectedMode}
        onModeChange={onModeChange}
        textareaPlaceholder={textareaPlaceholder}
      />
    </div>
  );
}
