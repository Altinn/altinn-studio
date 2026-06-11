import type { ReactElement } from 'react';
import type { AssistantMessage } from '../../../../types/ChatThread';
import type { MessageFeedbackTexts } from '../../../../types/AssistantTexts';
import type { UserFeedback } from '../../../../types/UserFeedback';
import { formatAssistantMessageContent } from '../../../../utils/messageUtils';
import { ChatAvatar } from '../../ChatAvatar';
import { MessageFeedback } from '../MessageFeedback';
import { ASSISTANT_LABEL } from '../constants';
import { SourceList } from './SourceList';
import { FilesChangedList } from './FilesChangedList';
import classes from './AssistantMessage.module.css';

export type AssistantMessageProps = {
  message: AssistantMessage;
  assistantAvatarUrl?: string;
  feedbackTexts?: MessageFeedbackTexts;
  onMessageFeedback?: (feedback: UserFeedback) => void;
};

export function AssistantMessage({
  message,
  assistantAvatarUrl,
  feedbackTexts,
  onMessageFeedback,
}: AssistantMessageProps): ReactElement {
  const { traceId } = message;
  const sources = message.sources ?? [];
  const filesChanged = message.filesChanged ?? [];
  const showFeedback = traceId && feedbackTexts && onMessageFeedback;

  return (
    <div className={classes.assistantRow}>
      <ChatAvatar src={assistantAvatarUrl} label={ASSISTANT_LABEL} variant='assistant' />
      <div className={classes.assistantMessage}>
        <div className={classes.messageMeta}>{ASSISTANT_LABEL}</div>
        <div className={classes.assistantBody}>
          <div
            className={classes.assistantContent}
            dangerouslySetInnerHTML={{ __html: formatAssistantMessageContent(message.content) }}
          />
        </div>
        {sources.length > 0 && <SourceList sources={sources} />}
        {filesChanged.length > 0 && <FilesChangedList filePaths={filesChanged} />}
        {showFeedback && (
          <MessageFeedback
            texts={feedbackTexts}
            onSubmit={(payload) => onMessageFeedback({ traceId, payload })}
          />
        )}
      </div>
    </div>
  );
}
