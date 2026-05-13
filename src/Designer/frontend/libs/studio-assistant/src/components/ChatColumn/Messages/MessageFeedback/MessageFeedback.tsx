import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import {
  StudioButton,
  StudioDialog,
  StudioHeading,
  StudioParagraph,
  StudioTextarea,
} from '@studio/components';
import { ThumbDownIcon, ThumbUpIcon, PaperplaneFillIcon } from '@studio/icons';
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

  const handleVoteClick = (vote: FeedbackVote): void => {
    setSelectedVote(vote);
    dialogRef.current?.showModal();
  };

  const handleSendFeedback = (): void => {
    const trimmedComment = commentText.trim();
    if (trimmedComment) {
      onSubmit(selectedVote, trimmedComment);
    } else {
      onSubmit(selectedVote);
    }
  };

  return (
    <>
      <div className={classes.feedbackBar}>
        <StudioButton
          variant='tertiary'
          data-size='sm'
          aria-label={texts.thumbsUp}
          title={texts.thumbsUp}
          onClick={() => handleVoteClick('up')}
          icon={<ThumbUpIcon />}
        />
        <StudioButton
          variant='tertiary'
          data-size='sm'
          aria-label={texts.thumbsDown}
          title={texts.thumbsDown}
          onClick={() => handleVoteClick('down')}
          icon={<ThumbDownIcon />}
        />
      </div>

      <StudioDialog ref={dialogRef} closedby='any'>
        <StudioDialog.Block>
          <StudioHeading level={2}>{texts.heading}</StudioHeading>
        </StudioDialog.Block>
        <StudioDialog.Block className={classes.dialogContent}>
          <StudioParagraph>{texts.body}</StudioParagraph>
          <StudioTextarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
          />
          <div className={classes.dialogActions}>
            <StudioButton
              variant='primary'
              onClick={handleSendFeedback}
              icon={<PaperplaneFillIcon />}
            >
              {texts.submit}
            </StudioButton>
          </div>
        </StudioDialog.Block>
      </StudioDialog>
    </>
  );
}
