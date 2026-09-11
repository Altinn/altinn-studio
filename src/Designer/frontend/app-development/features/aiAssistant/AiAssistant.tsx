import type { ReactElement } from 'react';
import { Assistant } from '@studio/assistant';
import { useTranslation } from 'react-i18next';
import { useAssistant, useAssistantPermissions, useAssistantTexts } from './hooks';
import { Preview } from './components/Preview';
import { FileBrowser } from './components/FileBrowser';
import classes from './AiAssistant.module.css';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useChatFeedbackMutation } from 'app-shared/hooks/mutations/useChatFeedbackMutation';
import { useClearChatFeedbackMutation } from 'app-shared/hooks/mutations/useClearChatFeedbackMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { StudioCenter, StudioAlert, StudioParagraph } from '@studio/components';

function AiAssistant(): ReactElement {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: currentUser } = useUserQuery();
  const userHasAccessToAssistant = useAssistantPermissions();
  const { mutate: sendChatFeedback } = useChatFeedbackMutation(org, app);
  const { mutate: clearChatFeedback } = useClearChatFeedbackMutation(org, app);
  const texts = useAssistantTexts();

  const {
    connectionStatus,
    workflowStatusByThread,
    chatThreads,
    messages,
    selectedThreadId,
    onSubmitMessage,
    cancelCurrentWorkflow,
    respondToPermission,
    cancelledMessageContent,
    clearCancelledMessageContent,
    selectThread,
    deleteThread,
  } = useAssistant();

  if (!userHasAccessToAssistant) {
    return (
      <StudioCenter>
        <StudioAlert>
          <StudioParagraph>{t('ai_assistant.access_denied')}</StudioParagraph>
        </StudioAlert>
      </StudioCenter>
    );
  }

  return (
    <div className={classes.container}>
      <Assistant
        texts={texts}
        enableCompactInterface={false}
        chatThreads={chatThreads}
        messages={messages}
        activeThreadId={selectedThreadId}
        onSubmitMessage={onSubmitMessage}
        onCancelWorkflow={cancelCurrentWorkflow}
        cancelledMessageContent={cancelledMessageContent}
        onCancelledMessageConsumed={clearCancelledMessageContent}
        onSelectThread={selectThread}
        onCreateThread={() => selectThread(null)}
        onDeleteThread={deleteThread}
        onMessageFeedback={sendChatFeedback}
        onClearMessageFeedback={clearChatFeedback}
        onPermissionResponse={respondToPermission}
        connectionStatus={connectionStatus}
        workflowStatusByThread={workflowStatusByThread}
        previewContent={<Preview />}
        fileBrowserContent={<FileBrowser />}
        currentUser={currentUser}
      />
    </div>
  );
}

export default AiAssistant;
