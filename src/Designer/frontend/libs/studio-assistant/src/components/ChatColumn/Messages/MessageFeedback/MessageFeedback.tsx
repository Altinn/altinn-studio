import type { ReactElement } from 'react';
import { useState } from 'react';
import {
  StudioButton,
  StudioDialog,
  StudioFormGroup,
  StudioHeading,
  StudioTextarea,
} from '@studio/components';
import { ThumbDownIcon, ThumbUpIcon, PaperplaneFillIcon, XMarkIcon } from '@studio/icons';
import type { MessageFeedbackTexts } from '../../../../types/AssistantTexts';
import type { FeedbackPayload } from '../../../../types/UserFeedback';
import classes from './MessageFeedback.module.css';

export type MessageFeedbackProps = {
  texts: MessageFeedbackTexts;
  onSubmit: (payload: FeedbackPayload) => void;
};

export function MessageFeedback({ texts, onSubmit }: MessageFeedbackProps): ReactElement {
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [selectedVote, setSelectedVote] = useState<boolean | null>(null);
  const [commentText, setCommentText] = useState<string>('');
  const commentPlaceholder = selectedVote === true ? texts.thumbsUp : texts.thumbsDown;

  const handleVoteClick = (vote: boolean): void => {
    setSelectedVote(vote);
    setIsDialogOpen(true);
  };

  const handleSendFeedback = (): void => {
    if (selectedVote === null) return;

    const trimmedComment = commentText.trim();
    onSubmit({
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
          <StudioFormGroup legend={texts.detailsLabel} tagText={texts.detailsOptionalTag}>
            <StudioTextarea
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder={commentPlaceholder}
            />
          </StudioFormGroup>
          <div className={classes.dialogActions}>
            <StudioButton
              variant='primary'
              onClick={handleSendFeedback}
              icon={<PaperplaneFillIcon />}
            >
              {texts.submit}
            </StudioButton>
            <StudioButton variant='secondary' onClick={handleDialogClose} icon={<XMarkIcon />}>
              {texts.cancel}
            </StudioButton>
          </div>
        </StudioDialog.Block>
      </StudioDialog>
    </>
  );
}
