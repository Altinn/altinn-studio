import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import {
  StudioButton,
  StudioSwitch,
  StudioTextarea,
  StudioValidationMessage,
} from '@designer/components';
import { PaperclipIcon, PaperplaneFillIcon, XMarkIcon } from '@designer/icons';
import type { UserAttachment, UserMessage } from '../../../types/ChatThread';
import classes from './UserInput.module.css';
import { createUserMessage } from '../../../utils/messageUtils';
import type { AssistantTexts } from '../../../types/AssistantTexts';

const allowedAttachmentFileExtensions = '.pdf,.md,.txt,.png,.jpg,.jpeg,.gif,.webp';
const maxAttachmentBytes = 20 * 1024 * 1024;
// The message and its attachments go in one request, and the load balancer accepts up to 50 MB.
// The last 5 MB are for the text and the form encoding.
const maxTotalAttachmentBytes = 45 * 1024 * 1024;

export type UserInputProps = {
  texts: AssistantTexts;
  onSubmitMessage: (message: UserMessage) => void;
  onCancelWorkflow?: () => void;
  cancelledMessageContent?: string | null;
  onCancelledMessageConsumed?: () => void;
  workflowIsActive?: boolean;
  canSubmit?: boolean;
  enableCompactInterface: boolean;
};

export function UserInput({
  texts,
  onSubmitMessage,
  onCancelWorkflow,
  cancelledMessageContent,
  onCancelledMessageConsumed,
  workflowIsActive = false,
  canSubmit = true,
  enableCompactInterface,
}: UserInputProps): ReactElement {
  const [messageContent, setMessageContent] = useState<string>('');
  const [allowAppChanges, setAllowAppChanges] = useState<boolean>(false);
  const [attachments, setAttachments] = useState<UserAttachment[]>([]);
  const [attachmentsTooLarge, setAttachmentsTooLarge] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (cancelledMessageContent) {
      setMessageContent(cancelledMessageContent);
      onCancelledMessageConsumed?.();
    }
  }, [cancelledMessageContent, onCancelledMessageConsumed]);

  const hasTextContent = messageContent.trim().length > 0;

  const resetInputs = useCallback((): void => {
    setMessageContent('');
    setAttachments([]);
    setAttachmentsTooLarge(false);
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
      const tooLarge = !fitSizeLimits(attachments, newFiles);
      setAttachmentsTooLarge(tooLarge);
      if (tooLarge) {
        event.target.value = '';
        return;
      }
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
    [attachments, fileToAttachment],
  );

  const handleRemoveAttachment = useCallback((indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, index) => index !== indexToRemove));
    setAttachmentsTooLarge(false);
  }, []);

  const handleSubmit = (): void => {
    if (!hasTextContent || !canSubmit) return;
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
        className={classes.textareaContainer}
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
                accept={allowedAttachmentFileExtensions}
                multiple
                onChange={handleAttachmentChange}
                ref={fileInputRef}
                type='file'
                className={classes.hiddenFileInput}
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
        {workflowIsActive && onCancelWorkflow ? (
          <StudioButton onClick={onCancelWorkflow} variant='secondary'>
            {texts.cancel} <XMarkIcon />
          </StudioButton>
        ) : (
          <StudioButton onClick={handleSubmit} disabled={!hasTextContent || !canSubmit}>
            {texts.send} <PaperplaneFillIcon />
          </StudioButton>
        )}
      </div>
      {attachmentsTooLarge && (
        <StudioValidationMessage>{texts.attachmentsTooLarge}</StudioValidationMessage>
      )}
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

function fitSizeLimits(attachments: UserAttachment[], newFiles: File[]): boolean {
  const attachedBytes = attachments.reduce((sum, attachment) => sum + (attachment.size ?? 0), 0);
  const newBytes = newFiles.reduce((sum, file) => sum + file.size, 0);
  return (
    newFiles.every((file) => file.size <= maxAttachmentBytes) &&
    attachedBytes + newBytes <= maxTotalAttachmentBytes
  );
}
