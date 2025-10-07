import React, { useState } from 'react';
import type { ReactElement } from 'react';
import { StudioButton, StudioSwitch, StudioTextarea } from '@studio/components';
import { MessageAuthor } from '../../../types/MessageAuthor';
import type { AssistantTexts, Message } from '../../../types/AssistantConfig';
import classes from './UserInput.module.css';
import { PaperclipIcon, PaperplaneFillIcon } from '@studio/icons';

export type UserInputProps = {
  texts: AssistantTexts;
  onSubmitMessage: (message: Message) => void;
};

export function UserInput({ texts, onSubmitMessage }: UserInputProps): ReactElement {
  const [messageContent, setMessageContent] = useState<string>('');
  const [allowEditing, setAllowEditing] = useState<boolean>(false);

  const handleSubmit = () => {
    if (!messageContent.trim()) return;

    const message: Message = {
      author: MessageAuthor.User,
      content: messageContent,
      allowEditing: allowEditing,
      timestamp: new Date(),
    };

    onSubmitMessage(message);
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
        placeholder={texts.textareaPlaceholder}
      />
      <div className={classes.actionsRow}>
        <div className={classes.actionsRowLeft}>
          <StudioButton variant='secondary'>
            <PaperclipIcon />
            {texts.addAttachment}
          </StudioButton>
          <StudioSwitch
            checked={allowEditing}
            onChange={(e) => setAllowEditing(e.target.checked)}
            label={texts.agentModeLabel}
          />
        </div>
        <StudioButton onClick={handleSubmit} disabled={!messageContent.trim()}>
          {texts.send} <PaperplaneFillIcon />
        </StudioButton>
      </div>
    </div>
  );
}
