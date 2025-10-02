import React, { useState } from 'react';
import type { ReactElement } from 'react';
import { StudioButton, StudioCard, StudioTextarea } from '@studio/components';
import { NativeSelect } from '@digdir/designsystemet-react';
import type { Message, ModeOption } from '../../types';
import { MessageAuthor } from '../../types/MessageAuthor';
import classes from './SimpleChatInterface.module.css';

export type SimpleChatInterfaceProps = {
  messages: Message[];
  onSendMessage: (message: Message) => void;
  sendButtonText: string;
  modeOptions?: ModeOption[];
  selectedMode?: string;
  onModeChange?: (mode: string) => void;
  textareaPlaceholder?: string;
};

export function SimpleChatInterface({
  messages,
  onSendMessage,
  sendButtonText,
  modeOptions,
  selectedMode,
  onModeChange,
  textareaPlaceholder,
}: SimpleChatInterfaceProps): ReactElement {
  const [messageContent, setMessageContent] = useState<string>('');

  const handleSubmit = () => {
    if (!messageContent.trim()) return;

    const message: Message = {
      author: MessageAuthor.User,
      content: messageContent,
      mode: selectedMode,
    };
    onSendMessage(message);
    setMessageContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={classes.container}>
      <div className={classes.messagesContainer}>
        {messages.map((message, index) => (
          <StudioCard
            key={index}
            className={
              message.author === MessageAuthor.User ? classes.userMessage : classes.assistantMessage
            }
          >
            <div className={classes.messageContent}>{message.content}</div>
          </StudioCard>
        ))}
      </div>
      <div className={classes.inputContainer}>
        <StudioTextarea
          value={messageContent}
          onChange={(e) => setMessageContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={textareaPlaceholder}
          className={classes.textarea}
        />
        <div className={classes.actionsRow}>
          {modeOptions && onModeChange && (
            <NativeSelect
              value={selectedMode}
              onChange={(e) => onModeChange(e.target.value)}
              className={classes.modeSelect}
              size='sm'
            >
              {modeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          )}
          <StudioButton onClick={handleSubmit} disabled={!messageContent.trim()} size='sm'>
            {sendButtonText}
          </StudioButton>
        </div>
      </div>
    </div>
  );
}
