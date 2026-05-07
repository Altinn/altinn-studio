import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  StudioButton,
  StudioDialog,
  StudioHeading,
  StudioParagraph,
  StudioTextarea,
} from '@studio/components';
import { ThumbDownIcon, ThumbUpIcon } from '@studio/icons';
import type { MessageFeedbackTexts } from '../../../../types/AssistantTexts';
import classes from './MessageFeedback.module.css';

export type FeedbackVote = 'up' | 'down';

export type MessageFeedbackProps = {
  texts: MessageFeedbackTexts;
  onSubmit: (vote: FeedbackVote, comment?: string) => void;
};

export function MessageFeedback({ texts, onSubmit }: MessageFeedbackProps): ReactElement {
  const [selectedVote, setSelectedVote] = useState<FeedbackVote | null>(null);
  const [commentText, setCommentText] = useState<string>('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const hasSubmittedRef = useRef<boolean>(false);
  const commentTextRef = useRef<string>('');
  const selectedVoteRef = useRef<FeedbackVote | null>(null);

  useEffect(() => {
    commentTextRef.current = commentText;
  }, [commentText]);

  useEffect(() => {
    selectedVoteRef.current = selectedVote;
  }, [selectedVote]);

  useEffect(() => {
    const dialogElement = dialogRef.current;
    if (!dialogElement) return undefined;

    const handleClose = (): void => {
      if (hasSubmittedRef.current) return;
      const currentVote = selectedVoteRef.current;
      if (!currentVote) return;
      hasSubmittedRef.current = true;
      const trimmedComment = commentTextRef.current.trim();
      onSubmit(currentVote, trimmedComment.length > 0 ? trimmedComment : undefined);
    };

    dialogElement.addEventListener('close', handleClose);
    return () => dialogElement.removeEventListener('close', handleClose);
  }, [onSubmit]);

  const handleVoteClick = (vote: FeedbackVote): void => {
    if (selectedVote) return;
    setSelectedVote(vote);
    dialogRef.current?.showModal();
  };

  const handleSendComment = (): void => {
    dialogRef.current?.close();
  };

  return (
    <>
      <div className={classes.feedbackBar}>
        <StudioButton
          variant='tertiary'
          data-size='sm'
          aria-label={texts.thumbsUp}
          aria-pressed={selectedVote === 'up'}
          onClick={() => handleVoteClick('up')}
          className={`${classes.feedbackButton} ${
            selectedVote === 'up' ? classes.feedbackButtonSelected : ''
          }`}
          icon={<ThumbUpIcon aria-hidden={true} />}
        />
        <StudioButton
          variant='tertiary'
          data-size='sm'
          aria-label={texts.thumbsDown}
          aria-pressed={selectedVote === 'down'}
          onClick={() => handleVoteClick('down')}
          className={`${classes.feedbackButton} ${
            selectedVote === 'down' ? classes.feedbackButtonSelected : ''
          }`}
          icon={<ThumbDownIcon aria-hidden={true} />}
        />
      </div>
      <StudioDialog ref={dialogRef} closedby='any' className={classes.dialog}>
        <StudioDialog.Block>
          <StudioHeading level={2} data-size='sm'>
            {texts.thanksHeading}
          </StudioHeading>
        </StudioDialog.Block>
        <StudioDialog.Block>
          <StudioParagraph spacing>{texts.elaboratePrompt}</StudioParagraph>
          <StudioTextarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder={texts.commentPlaceholder}
            rows={4}
          />
          <div className={classes.dialogActions}>
            <StudioButton variant='primary' onClick={handleSendComment}>
              {texts.submit}
            </StudioButton>
          </div>
        </StudioDialog.Block>
      </StudioDialog>
    </>
  );
}
