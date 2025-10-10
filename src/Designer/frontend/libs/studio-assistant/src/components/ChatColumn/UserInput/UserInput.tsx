import React, { useState } from 'react';
import type { ReactElement } from 'react';
import { StudioButton, StudioSwitch, StudioTextarea } from '@studio/components';
import type { UserMessage } from '../../../types/ChatThread';
import classes from './UserInput.module.css';
import { PaperclipIcon, PaperplaneFillIcon } from '@studio/icons';
import type { AssistantProps } from '../../../Assistant/Assistant';
import { createUserMessage } from '../../../utils/utils';

export type UserInputProps = Omit<AssistantProps, 'chatThreads'>;

export function UserInput({
  texts,
  onSubmitMessage,
  enableCompactInterface,
}: UserInputProps): ReactElement {
  const [messageContent, setMessageContent] = useState<string>('');
  const [allowEditing, setAllowEditing] = useState<boolean>(true);

  const handleSubmit = () => {
    if (!messageContent.trim()) return;

    const message: UserMessage = createUserMessage(messageContent, allowEditing);

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
          {/* TODO: Attachment button should open upload dialog */}
          {!enableCompactInterface && (
            <StudioButton variant='secondary' title={texts.addAttachment}>
              <PaperclipIcon />
            </StudioButton>
          )}
          {!enableCompactInterface && (
            <StudioSwitch
              checked={allowEditing}
              onChange={(e) => setAllowEditing(e.target.checked)}
              label={texts.agentModeSwitch}
            />
          )}
        </div>
        <StudioButton onClick={handleSubmit} disabled={!messageContent.trim()}>
          {texts.send} <PaperplaneFillIcon />
        </StudioButton>
      </div>
    </div>
  );
}
