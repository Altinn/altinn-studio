import type { ReactElement } from 'react';
import { useState } from 'react';
import {
  StudioButton,
  StudioDialog,
  StudioFormGroup,
  StudioHeading,
  StudioTextarea,
} from '@studio/components';
import {
  ThumbDownIcon,
  ThumbUpIcon,
  ThumbDownFillIcon,
  ThumbUpFillIcon,
  PaperplaneFillIcon,
  XMarkIcon,
} from '@studio/icons';
import type { MessageFeedbackTexts } from '../../../../../types/AssistantTexts';
import type { FeedbackPayload } from '../../../../../types/UserFeedback';
import classes from './MessageFeedback.module.css';

export type MessageFeedbackProps = {
  texts: MessageFeedbackTexts;
  currentVote?: boolean;
  onSubmit: (payload: FeedbackPayload) => void;
  onClear?: () => void;
};

export function MessageFeedback({
  texts,
  currentVote,
  onSubmit,
  onClear,
}: MessageFeedbackProps): ReactElement {
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [selectedVote, setSelectedVote] = useState<boolean | null>(null);
  const [commentText, setCommentText] = useState<string>('');
  const commentPlaceholder = selectedVote === true ? texts.thumbsUp : texts.thumbsDown;

  const handleVoteClick = (vote: boolean): void => {
    if (currentVote === vote && onClear) {
      onClear();
      return;
    }
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
          aria-pressed={currentVote === true}
          title={currentVote === true ? texts.clear : texts.thumbsUp}
          className={currentVote === true ? classes.selectedVote : undefined}
          onClick={() => handleVoteClick(true)}
          icon={currentVote === true ? <ThumbUpFillIcon /> : <ThumbUpIcon />}
        />
        <StudioButton
          variant='tertiary'
          data-size='sm'
          aria-label={texts.thumbsDown}
          aria-pressed={currentVote === false}
          title={currentVote === false ? texts.clear : texts.thumbsDown}
          className={currentVote === false ? classes.selectedVote : undefined}
          onClick={() => handleVoteClick(false)}
          icon={currentVote === false ? <ThumbDownFillIcon /> : <ThumbDownIcon />}
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
