import type { ReactElement } from 'react';
import { useState } from 'react';
import {
  StudioButton,
  StudioDialog,
  StudioHeading,
  StudioParagraph,
  StudioTextarea,
} from '@studio/components';
import { ThumbDownIcon, ThumbUpIcon, PaperplaneFillIcon } from '@studio/icons';
import type { MessageFeedbackTexts } from '../../../../types/AssistantTexts';
import type { UserFeedback } from '../../../../types/UserFeedback';
import classes from './MessageFeedback.module.css';

export type MessageFeedbackProps = {
  texts: MessageFeedbackTexts;
  traceId: string;
  onSubmit: (feedback: UserFeedback) => void;
};

export function MessageFeedback({ texts, traceId, onSubmit }: MessageFeedbackProps): ReactElement {
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [selectedVote, setSelectedVote] = useState<boolean | null>(null);
  const [commentText, setCommentText] = useState<string>('');

  const handleVoteClick = (vote: boolean): void => {
    setSelectedVote(vote);
    setIsDialogOpen(true);
  };

  const handleSendFeedback = (): void => {
    if (selectedVote === null) return;

    const trimmedComment = commentText.trim();
    onSubmit({
      traceId,
      thumbsUp: selectedVote,
      comment: trimmedComment || undefined,
    });
    handleDialogClose();
  };

  const handleDialogClose = (): void => {
    setIsDialogOpen(false);
    setSelectedVote(null);
    setCommentText('');
  };

  return (
    <>
      <div className={classes.feedbackBar}>
        <StudioButton
          variant='tertiary'
          data-size='sm'
          aria-label={texts.thumbsUp}
          title={texts.thumbsUp}
          onClick={() => handleVoteClick(true)}
          icon={<ThumbUpIcon />}
        />
        <StudioButton
          variant='tertiary'
          data-size='sm'
          aria-label={texts.thumbsDown}
          title={texts.thumbsDown}
          onClick={() => handleVoteClick(false)}
          icon={<ThumbDownIcon />}
        />
      </div>

      <StudioDialog open={isDialogOpen} closedby='any' onClose={handleDialogClose}>
        <StudioDialog.Block>
          <StudioHeading level={2}>{texts.heading}</StudioHeading>
        </StudioDialog.Block>
        <StudioDialog.Block className={classes.dialogContent}>
          <StudioParagraph>{texts.body}</StudioParagraph>
          {/* TODO: Add label for the text area, with an "optional" tag */}
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
