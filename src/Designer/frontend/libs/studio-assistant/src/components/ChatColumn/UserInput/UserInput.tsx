import React, { useState } from 'react';
import type { ReactElement } from 'react';
import { StudioButton, StudioTextarea } from '@studio/components';
import { NativeSelect } from '@digdir/designsystemet-react';
import { MessageAuthor } from '../../../types/MessageAuthor';
import type { Message } from '../../../types/AssistantConfig';
import type { ModeOption } from '../../../types/ChatThread';
import classes from './UserInput.module.css';
import { PaperplaneFillIcon } from '@studio/icons';

export type UserInputProps = {
  onSendMessage: (message: Message) => void;
  sendButtonText: string;
  modeOptions?: ModeOption[];
  selectedMode?: string;
  onModeChange?: (mode: string) => void;
  textareaPlaceholder?: string;
};

export function UserInput({
  onSendMessage,
  sendButtonText,
  modeOptions,
  selectedMode,
  onModeChange,
  textareaPlaceholder,
}: UserInputProps): ReactElement {
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
    <div className={classes.inputContainer}>
      <StudioTextarea
        value={messageContent}
        onChange={(e) => setMessageContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={textareaPlaceholder}
      />
      <div className={classes.actionsRow}>
        {modeOptions && onModeChange && (
          <NativeSelect
            value={selectedMode}
            onChange={(e) => onModeChange(e.target.value)}
            size='sm'
          >
            {modeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        )}
        <StudioButton onClick={handleSubmit} disabled={!messageContent.trim()}>
          {sendButtonText} <PaperplaneFillIcon />
        </StudioButton>
      </div>
    </div>
  );
}
