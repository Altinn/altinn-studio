import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { StudioButton, StudioSelect, StudioSwitch, StudioTextarea } from '@studio/components';
import { PaperclipIcon, PaperplaneFillIcon, XMarkIcon } from '@studio/icons';
import type { UserAttachment, UserMessage } from '../../../types/ChatThread';
import classes from './UserInput.module.css';
import { createUserMessage } from '../../../utils/messageUtils';
import type { AssistantTexts } from '../../../types/AssistantTexts';

const CONCURRENCY_OPTIONS = [1, 2, 3, 5, 10, 25, 50] as const;
const DEFAULT_CONCURRENCY = 1;
const DELAY_BETWEEN_SESSIONS_MS = 100;

export type UserInputProps = {
  texts: AssistantTexts;
  onSubmitMessage: (message: UserMessage) => void;
  onCancelWorkflow?: () => void;
  onCreateThread?: () => void;
  cancelledMessageContent?: string | null;
  onCancelledMessageConsumed?: () => void;
  workflowIsActive?: boolean;
  enableCompactInterface: boolean;
};

export function UserInput({
  texts,
  onSubmitMessage,
  onCancelWorkflow,
  onCreateThread,
  cancelledMessageContent,
  onCancelledMessageConsumed,
  workflowIsActive = false,
  enableCompactInterface,
}: UserInputProps): ReactElement {
  const [messageContent, setMessageContent] = useState<string>('');
  const [allowAppChanges, setAllowAppChanges] = useState<boolean>(false);
  const [attachments, setAttachments] = useState<UserAttachment[]>([]);
  const [concurrency, setConcurrency] = useState<number>(DEFAULT_CONCURRENCY);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (cancelledMessageContent) {
      setMessageContent(cancelledMessageContent);
      onCancelledMessageConsumed?.();
    }
  }, [cancelledMessageContent, onCancelledMessageConsumed]);

  const hasTextContent = messageContent.trim().length > 0;
  const isLoadTest = concurrency > 1;
  const canSubmit = isLoadTest || hasTextContent;

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

  // Relies on the host's onCreateThread synchronously activating a new session,
  // so the immediately-following onSubmitMessage routes to it.
  const scheduleLoadTest = (): void => {
    for (let iteration = 1; iteration <= concurrency; iteration++) {
      const delayMs = (iteration - 1) * DELAY_BETWEEN_SESSIONS_MS;
      setTimeout(() => {
        onCreateThread?.();
        onSubmitMessage(
          createUserMessage(
            `Add a text component named test-${iteration}`,
            allowAppChanges,
            attachments,
          ),
        );
      }, delayMs);
    }
  };

  const handleSubmit = (): void => {
    if (!canSubmit) return;
    if (isLoadTest) {
      scheduleLoadTest();
    } else {
      onSubmitMessage(createUserMessage(messageContent, allowAppChanges, attachments));
    }
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
                accept='*/*'
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
        <div className={classes.actionsRowRight}>
          <StudioSelect
            className={classes.concurrencySelect}
            label={texts.concurrencyLabel}
            aria-label={texts.concurrencyLabel}
            value={String(concurrency)}
            onChange={(event) => setConcurrency(Number(event.target.value))}
          >
            {CONCURRENCY_OPTIONS.map((option) => (
              <StudioSelect.Option key={option} value={String(option)}>
                {option}
              </StudioSelect.Option>
            ))}
          </StudioSelect>
          {workflowIsActive && onCancelWorkflow ? (
            <StudioButton onClick={onCancelWorkflow} variant='secondary'>
              {texts.cancel} <XMarkIcon />
            </StudioButton>
          ) : (
            <StudioButton onClick={handleSubmit} disabled={!canSubmit}>
              {texts.send} <PaperplaneFillIcon />
            </StudioButton>
          )}
        </div>
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
