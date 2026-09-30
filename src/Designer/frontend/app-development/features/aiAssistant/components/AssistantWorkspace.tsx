import type { ReactElement } from 'react';
import { Assistant } from '@studio/assistant';
import { useAssistant, useAssistantTexts } from '../hooks';
import { Preview } from './Preview';
import { FileBrowser } from './FileBrowser';
import classes from '../AiAssistant.module.css';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useChatFeedbackMutation } from 'app-shared/hooks/mutations/useChatFeedbackMutation';
import { useClearChatFeedbackMutation } from 'app-shared/hooks/mutations/useClearChatFeedbackMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export function AssistantWorkspace(): ReactElement {
  const { org, app } = useStudioEnvironmentParams();
  const { data: currentUser } = useUserQuery();
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
