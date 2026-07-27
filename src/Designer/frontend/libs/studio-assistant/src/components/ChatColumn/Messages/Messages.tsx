import type { ReactElement } from 'react';
import { StudioCard, StudioParagraph, StudioTag } from '@studio/components';
import { PaperclipIcon } from '@studio/icons';
import type { User } from '../../../types/User';
import { MessageAuthor } from '../../../types/MessageAuthor';
import classes from './Messages.module.css';
import type { Message, UserAttachment, UserMessage, Source } from '../../../types/ChatThread';
import type { WorkflowStatus, TrailStep } from '../../../types/WorkflowStatus';
import {
  formatAssistantMessageContent,
  formatFileSize,
  isUrlSafe,
} from '../../../utils/messageUtils';
import { ChatAvatar } from '../ChatAvatar';
import { ActivityTrail } from './ActivityTrail';

const ASSISTANT_LABEL = 'Altinity';
const DEFAULT_USER_LABEL = 'Deg';

export type MessagesProps = {
  messages: Message[];
  workflowStatus?: WorkflowStatus;
  currentUser?: User;
  assistantAvatarUrl?: string;
};

export function Messages({
  messages,
  workflowStatus,
  currentUser,
  assistantAvatarUrl,
}: MessagesProps): ReactElement {
  const showTrail = workflowStatus?.isActive === true;
  const trailSteps = resolveTrailSteps(workflowStatus);

  return (
    <div className={classes.messagesContainer}>
      {messages.map((message, index) => (
        <MessageItem
          key={index}
          message={message}
          currentUser={currentUser}
          assistantAvatarUrl={assistantAvatarUrl}
        />
      ))}
      {showTrail && (
        <ActivityTrailBubble steps={trailSteps} assistantAvatarUrl={assistantAvatarUrl} />
      )}
    </div>
  );
}

/**
 * The trail bubble takes the place of the assistant's reply while the
 * workflow is active. When the agent finishes, this bubble is replaced by
 * the final assistant message — the trail is intentionally not persisted.
 */
type ActivityTrailBubbleProps = {
  steps: TrailStep[];
  assistantAvatarUrl?: string;
};

function ActivityTrailBubble({
  steps,
  assistantAvatarUrl,
}: ActivityTrailBubbleProps): ReactElement {
  return (
    <div className={`${classes.messageRow} ${classes.assistantRow}`}>
      <ChatAvatar src={assistantAvatarUrl} label={ASSISTANT_LABEL} variant='assistant' />
      <div className={classes.assistantMessage}>
        <div className={classes.messageMeta}>{ASSISTANT_LABEL}</div>
        <ActivityTrail steps={steps} />
      </div>
    </div>
  );
}

/**
 * Older callers that only set `message` (no `steps[]`) still get a single
 * step rendered so the trail bubble doesn't appear empty — keeps the
 * component robust against partial state.
 */
function resolveTrailSteps(workflowStatus: WorkflowStatus | undefined): TrailStep[] {
  if (!workflowStatus) return [];
  if (workflowStatus.steps && workflowStatus.steps.length > 0) {
    return workflowStatus.steps;
  }
  if (workflowStatus.message) {
    return [{ id: 'legacy', message: workflowStatus.message, offsetMs: 0 }];
  }
  return [];
}

type MessageItemProps = {
  message: Message;
  currentUser?: User;
  assistantAvatarUrl?: string;
};

function MessageItem({ message, currentUser, assistantAvatarUrl }: MessageItemProps): ReactElement {
  const isUser = message.role === MessageAuthor.User;
  const userLabel = currentUser?.full_name ?? DEFAULT_USER_LABEL;

  const renderUserAttachments = (attachments: UserAttachment[]): ReactElement | null => {
    if (!attachments || attachments.length === 0) {
      return null;
    }

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
  };

  if (isUser) {
    const userMessage = message as UserMessage;
    return (
      <div className={`${classes.messageRow} ${classes.userRow}`}>
        <div className={classes.messageWrapper}>
          <div className={classes.messageMeta}>{userLabel}</div>
          <StudioCard className={classes.userMessage}>
            {userMessage.content && (
              <StudioParagraph className={classes.messageBody}>
                {userMessage.content}
              </StudioParagraph>
            )}
            {userMessage.attachments &&
              userMessage.attachments.length > 0 &&
              renderUserAttachments(userMessage.attachments)}
          </StudioCard>
        </div>
        <ChatAvatar src={currentUser?.avatar_url} label={userLabel} variant='user' />
      </div>
    );
  }

  const renderFilesChanged = (): ReactElement | null => {
    if (message.role !== MessageAuthor.Assistant) return null;

    const assistantMessage = message;
    if (!assistantMessage.filesChanged || assistantMessage.filesChanged.length === 0) return null;

    return (
      <div className={classes.filesSection}>
        <span className={classes.filesSectionTitle}>Files Modified</span>
        <div className={classes.fileCards}>
          {assistantMessage.filesChanged.map((filePath) => {
            const parts = filePath.split('/');
            const fileName = parts.pop() ?? filePath;
            const directory = parts.join('/');

            return (
              <button
                key={filePath}
                type='button'
                className={classes.fileCard}
                title={filePath}
                data-file-path={filePath}
              >
                <StudioTag data-color='accent'>{fileName}</StudioTag>
                {directory && <span className={classes.fileCardDirectory}>{directory}</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSourceItem = (
    source: Source,
    index: number,
    isCited: boolean,
  ): ReactElement | null => {
    const safeUrl = source.url && isUrlSafe(source.url) ? source.url : null;

    return (
      <div
        key={`${source.tool}-${index}`}
        className={`${classes.sourceItem} ${!isCited ? classes.sourceItemSecondary : ''}`}
      >
        <div className={classes.sourceHeader}>
          {safeUrl ? (
            <a
              href={safeUrl}
              target='_blank'
              rel='noopener noreferrer'
              className={classes.sourceTitle}
            >
              {isCited ? '✅' : '🔗'} {source.title}
            </a>
          ) : (
            <span className={classes.sourceTitle}>
              {isCited ? '✅' : '📄'} {source.title}
            </span>
          )}
          <div className={classes.sourceMetadata}>
            {source.relevance !== undefined && (
              <span className={classes.sourceRelevance}>{Math.round(source.relevance * 100)}%</span>
            )}
            {source.contentLength && (
              <span className={classes.sourceSize}>{formatFileSize(source.contentLength)}</span>
            )}
          </div>
        </div>
        {source.matchedTerms && (
          <div className={classes.sourceMatched}>Matched: {source.matchedTerms}</div>
        )}
        {source.previewText && <div className={classes.sourcePreview}>{source.previewText}</div>}
      </div>
    );
  };

  const renderSources = (): ReactElement | null => {
    if (message.role !== MessageAuthor.Assistant) return null;

    const assistantMessage = message;
    if (!assistantMessage.sources || assistantMessage.sources.length === 0) return null;

    const citedSources = assistantMessage.sources.filter((s) => s.cited);
    const otherSources = assistantMessage.sources.filter((s) => !s.cited);

    return (
      <div className={classes.sourcesSection}>
        {citedSources.length > 0 && (
          <>
            <div className={classes.sourcesSectionHeader}>
              <span className={classes.sourcesSectionTitle}>📚 Kilder brukt</span>
              <span className={classes.sourcesSectionCount}>{citedSources.length}</span>
            </div>
            <div className={classes.sourcesList}>
              {citedSources.map((source, index) => renderSourceItem(source, index, true))}
            </div>
          </>
        )}

        {otherSources.length > 0 && (
          <>
            <div
              className={`${classes.sourcesSectionHeader} ${classes.sourcesSectionHeaderSecondary}`}
            >
              <span className={classes.sourcesSectionTitleSecondary}>📖 Tilgjengelige kilder</span>
              <span className={classes.sourcesSectionCount}>{otherSources.length}</span>
            </div>
            <div className={classes.sourcesList}>
              {otherSources.map((source, index) => renderSourceItem(source, index, false))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className={`${classes.messageRow} ${classes.assistantRow}`}>
      <ChatAvatar src={assistantAvatarUrl} label={ASSISTANT_LABEL} variant='assistant' />
      <div className={classes.assistantMessage}>
        <div className={classes.messageMeta}>{ASSISTANT_LABEL}</div>
        <div className={classes.assistantBody}>
          <div
            className={classes.assistantContent}
            dangerouslySetInnerHTML={{ __html: formatAssistantMessageContent(message.content) }}
          />
        </div>
        {renderSources()}
        {renderFilesChanged()}
      </div>
    </div>
  );
}
