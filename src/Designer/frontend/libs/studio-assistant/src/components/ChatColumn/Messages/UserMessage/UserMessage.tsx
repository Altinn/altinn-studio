import type { ReactElement } from 'react';
import { StudioCard, StudioParagraph } from '@studio/components';
import { PaperclipIcon } from '@studio/icons';
import type { User } from '../../../../types/User';
import type { UserAttachment, UserMessage } from '../../../../types/ChatThread';
import { ChatAvatar } from '../../ChatAvatar';
import { DEFAULT_USER_LABEL } from '../constants';
import classes from './UserMessage.module.css';

export type UserMessageProps = {
  message: UserMessage;
  currentUser?: User;
};

export function UserMessage({ message, currentUser }: UserMessageProps): ReactElement {
  const userLabel = currentUser?.full_name ?? DEFAULT_USER_LABEL;
  const attachments = message.attachments ?? [];
  const hasAttachments = attachments.length > 0;

  return (
    <div className={classes.userRow}>
      <div className={classes.messageWrapper}>
        <div className={classes.messageMeta}>{userLabel}</div>
        <StudioCard className={classes.userMessage}>
          {message.content && (
            <StudioParagraph className={classes.messageBody}>{message.content}</StudioParagraph>
          )}
          {hasAttachments && <UserAttachmentList attachments={attachments} />}
        </StudioCard>
      </div>
      <ChatAvatar src={currentUser?.avatar_url} label={userLabel} variant='user' />
    </div>
  );
}

type UserAttachmentListProps = {
  attachments: UserAttachment[];
};

function UserAttachmentList({ attachments }: UserAttachmentListProps): ReactElement {
  return (
    <ul className={classes.userAttachments}>
      {attachments.map((attachment, index) => {
        const isImage = attachment.mimeType?.startsWith('image/');
        const key = `${attachment.name}-${attachment.size}-${index}`;

        return (
          <li key={key} className={classes.userAttachmentItem}>
            {isImage ? (
              <img
                src={attachment.dataBase64}
                alt={attachment.name}
                className={classes.userAttachmentImage}
              />
            ) : (
              <span className={classes.userAttachmentIcon} aria-hidden={true}>
                <PaperclipIcon />
              </span>
            )}
            <span className={classes.userAttachmentLabel}>{attachment.name}</span>
          </li>
        );
      })}
    </ul>
  );
}
