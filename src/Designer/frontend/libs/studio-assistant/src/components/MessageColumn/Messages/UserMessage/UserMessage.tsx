import type { ReactElement } from 'react';
import { StudioCard, StudioParagraph } from '@studio/components';
import { PaperclipIcon } from '@studio/icons';
import type { User } from '../../../../types/User';
import type { UserAttachment, UserMessage } from '../../../../types/ChatThread';
import { MessageRow } from '../MessageRow';
import classes from './UserMessage.module.css';

export type UserMessageProps = {
  message: UserMessage;
  currentUser?: User;
};

export function UserMessage({ message, currentUser }: UserMessageProps): ReactElement {
  const userLabel = currentUser ? currentUser.full_name || currentUser.login : '';
  const attachments = message.attachments ?? [];
  const hasAttachments = attachments.length > 0;

  return (
    <MessageRow label={userLabel} variant='user' avatarSrc={currentUser?.avatar_url}>
      <StudioCard className={classes.userMessage}>
        {message.content && (
          <StudioParagraph className={classes.messageBody}>{message.content}</StudioParagraph>
        )}
        {hasAttachments && <UserAttachmentList attachments={attachments} />}
      </StudioCard>
    </MessageRow>
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
