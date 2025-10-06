import React, { useState } from 'react';
import type { ReactElement, ChangeEvent } from 'react';
import { StudioButton, StudioSwitch, StudioTextarea } from '@studio/components';
import { MessageAuthor } from '../../../types/MessageAuthor';
import type { Message } from '../../../types/AssistantConfig';
import classes from './UserInput.module.css';
import { PaperplaneFillIcon } from '@studio/icons';

export type UserInputProps = {
  onSendMessage: (message: Message) => void;
  sendButtonText: string;
  selectedMode?: boolean;
  onModeChange?: (mode: boolean) => void;
  textareaPlaceholder?: string;
};

export function UserInput({
  onSendMessage,
  sendButtonText,
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
      allowEditing: selectedMode,
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
        {onModeChange && (
          <StudioSwitch
            checked={!!selectedMode}
            onChange={(e) => onModeChange(e.target.checked)}
            label='Tillat endringer i appen'
          />
        )}
        <StudioButton onClick={handleSubmit} disabled={!messageContent.trim()}>
          {sendButtonText} <PaperplaneFillIcon />
        </StudioButton>
      </div>
    </div>
  );
}
