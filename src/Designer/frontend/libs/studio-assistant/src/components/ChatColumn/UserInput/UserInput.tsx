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
  const [allowAppChanges, setAllowAppChanges] = useState<boolean>(true);

  const handleSubmit = (): void => {
    const message: UserMessage = createUserMessage(messageContent, allowAppChanges);
    onSubmitMessage(message);
    setMessageContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
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
              checked={allowAppChanges}
              onChange={(e) => setAllowAppChanges(e.target.checked)}
              label={texts.allowAppChangesSwitch}
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
