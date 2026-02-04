import React, { useCallback, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { StudioButton, StudioSwitch, StudioTextarea } from '@studio/components';
import { PaperclipIcon, PaperplaneFillIcon, XMarkIcon } from '@studio/icons';
import type { UserAttachment, UserMessage } from '../../../types/ChatThread';
import classes from './UserInput.module.css';
import { createUserMessage } from '../../../utils/utils';
import type { AssistantTexts } from 'libs/studio-assistant/src/types/AssistantTexts';

export type UserInputProps = {
  texts: AssistantTexts;
  onSubmitMessage: (message: UserMessage) => void;
  enableCompactInterface: boolean;
};

export function UserInput({
  texts,
  onSubmitMessage,
  enableCompactInterface,
}: UserInputProps): ReactElement {
  const [messageContent, setMessageContent] = useState<string>('');
  const [allowAppChanges, setAllowAppChanges] = useState<boolean>(false);
  const [attachments, setAttachments] = useState<UserAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasTextContent = messageContent.trim().length > 0;
  const canSubmit = hasTextContent || attachments.length > 0;

  const resetInputs = useCallback((): void => {
    setMessageContent('');
    setAttachments([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const fileToAttachment = useCallback((file: File): Promise<UserAttachment> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (): void => {
        resolve({
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          dataBase64: typeof reader.result === 'string' ? reader.result : '',
        });
      };
      reader.onerror = (): void => reject(reader.error ?? new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  const handleAttachmentChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      const newFiles = Array.from(files);
      try {
        const newAttachments = await Promise.all(newFiles.map((file) => fileToAttachment(file)));
        setAttachments((prev) => [...prev, ...newAttachments]);
      } catch (error) {
        console.error('Failed to read attachment', error);
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [fileToAttachment],
  );

  const handleRemoveAttachment = useCallback((indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, index) => index !== indexToRemove));
  }, []);

  const handleSubmit = (): void => {
    if (!canSubmit) return;
    const message: UserMessage = createUserMessage(messageContent, allowAppChanges, attachments);
    onSubmitMessage(message);
    resetInputs();
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
        placeholder={texts.textarea.placeholder}
      />
      <div className={classes.actionsRow}>
        <div className={classes.actionsRowLeft}>
          {!enableCompactInterface && (
            <>
              <input
                accept='*/*'
                multiple
                onChange={handleAttachmentChange}
                ref={fileInputRef}
                type='file'
                className={classes.hiddenFileInput}
                data-testid='user-input-file'
                aria-label={texts.addAttachment}
              />
              <StudioButton
                variant='secondary'
                title={texts.addAttachment}
                aria-label={texts.addAttachment}
                onClick={() => fileInputRef.current?.click()}
              >
                <PaperclipIcon />
              </StudioButton>
            </>
          )}
          {!enableCompactInterface && (
            <StudioSwitch
              checked={allowAppChanges}
              disabled={false}
              onChange={(e) => setAllowAppChanges(e.target.checked)}
              label={texts.allowAppChangesSwitch}
            />
          )}
        </div>
        <StudioButton onClick={handleSubmit} disabled={!canSubmit}>
          {texts.send} <PaperplaneFillIcon />
        </StudioButton>
      </div>
      {attachments.length > 0 && (
        <ul className={classes.attachmentList}>
          {attachments.map((attachment, index) => (
            <li
              key={`${attachment.name}-${attachment.size}-${index}`}
              className={classes.attachmentItem}
            >
              <span className={classes.attachmentName}>{attachment.name}</span>
              <button
                type='button'
                className={classes.removeAttachmentButton}
                onClick={() => handleRemoveAttachment(index)}
                aria-label={`${texts.cancel} ${attachment.name}`}
              >
                <XMarkIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
