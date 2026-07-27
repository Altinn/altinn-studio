import type { ReactElement } from 'react';
import type { AssistantMessage } from '../../../../types/ChatThread';
import type { AssistantTexts } from '../../../../types/AssistantTexts';
import type { UserFeedback } from '../../../../types/UserFeedback';
import {
  formatAssistantMessageContent,
  filterCriticalFileNames,
} from '../../../../utils/messageUtils';
import { MessageFeedback } from './MessageFeedback';
import { MessageRow } from '../MessageRow';
import { SourceList } from './SourceList';
import { CriticalFileAlert } from './CriticalFileAlert';
import { FilesChangedList } from './FilesChangedList';
import classes from './AssistantMessage.module.css';

export type AssistantMessageProps = {
  message: AssistantMessage;
  texts: AssistantTexts;
  assistantAvatarUrl?: string;
  onMessageFeedback?: (feedback: UserFeedback) => void;
};

export function AssistantMessage({
  message,
  texts,
  assistantAvatarUrl,
  onMessageFeedback,
}: AssistantMessageProps): ReactElement {
  const { traceId } = message;
  const sources = message.sources ?? [];
  const filesChanged = message.filesChanged ?? [];
  const criticalFiles = filterCriticalFileNames(filesChanged);
  const showFeedback = traceId && onMessageFeedback;

  return (
    <MessageRow label={texts.heading} variant='assistant' avatarSrc={assistantAvatarUrl}>
      <div className={classes.assistantBody}>
        <div
          className={classes.assistantContent}
          dangerouslySetInnerHTML={{ __html: formatAssistantMessageContent(message.content) }}
        />
      </div>
      {sources.length > 0 && <SourceList sources={sources} />}
      {filesChanged.length > 0 && <FilesChangedList filePaths={filesChanged} />}
      {criticalFiles.length > 0 && (
        <CriticalFileAlert criticalFiles={criticalFiles} texts={texts.criticalFileAlert} />
      )}
      {showFeedback && (
        <MessageFeedback
          texts={texts.feedback}
          onSubmit={(payload) => onMessageFeedback({ traceId, payload })}
        />
      )}
    </MessageRow>
  );
}
