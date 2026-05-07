import type { ReactElement } from 'react';
import { useCallback } from 'react';
import type { AssistantTexts, FeedbackVote } from '@studio/assistant';
import { Assistant } from '@studio/assistant';
import { Trans, useTranslation } from 'react-i18next';
import { useAltinityAssistant, useAltinityPermissions } from './hooks';
import { Preview } from './components/Preview';
import { FileBrowser } from './components/FileBrowser';
import classes from './AiAssistant.module.css';
import { useUserQuery } from 'app-shared/hooks/queries';
import { useChatFeedbackMutation } from 'app-shared/hooks/mutations/useChatFeedbackMutation';
import { StudioCenter, StudioAlert, StudioParagraph } from '@studio/components';

function AiAssistant(): ReactElement {
  const { t } = useTranslation();
  const { data: currentUser } = useUserQuery();
  const userHasAccessToAssistant = useAltinityPermissions();
  const { mutate: sendChatFeedback } = useChatFeedbackMutation();

  const handleMessageFeedback = useCallback(
    (traceId: string, vote: FeedbackVote, comment?: string) => {
      sendChatFeedback({ traceId, thumbsUp: vote === 'up', comment });
    },
    [sendChatFeedback],
  );

  const {
    connectionStatus,
    workflowStatus,
    chatThreads,
    messages,
    currentSessionId,
    onSubmitMessage,
    cancelCurrentWorkflow,
    cancelledMessageContent,
    clearCancelledMessageContent,
    selectThread,
    clearCurrentSession,
    deleteThread,
  } = useAltinityAssistant();

  const texts: AssistantTexts = {
    heading: t('ai_assistant.heading'),
    preview: t('ai_assistant.preview'),
    fileBrowser: t('ai_assistant.file_browser'),
    hideThreads: t('ai_assistant.hide_threads'),
    showThreads: t('ai_assistant.show_threads'),
    newThread: t('ai_assistant.new_thread'),
    previousThreads: t('ai_assistant.threads'),
    aboutAssistant: t('ai_assistant.about_assistant'),
    aboutAssistantDialog: {
      heading: t('ai_assistant.about_assistant_heading'),
      description: (
        <Trans
          i18nKey='ai_assistant.about_assistant_description'
          components={{ strong: <strong /> }}
        />
      ),
      branchInfo: (
        <Trans
          i18nKey='ai_assistant.about_assistant_branch_info'
          components={{ strong: <strong /> }}
        />
      ),
      branchDocsLink: t('ai_assistant.about_assistant_branch_docs_link'),
      disclaimer: t('ai_assistant.about_assistant_disclaimer'),
    },
    textarea: {
      placeholder: t('ai_assistant.textarea_placeholder'),
      wait: 'Vent litt ...',
      waitingForConnection: 'Venter på forbindelse med Altinity ...',
    },
    addAttachment: t('ai_assistant.add_attachment'),
    allowAppChangesSwitch: t('ai_assistant.allow_app_changes'),
    send: t('ai_assistant.send'),
    cancel: 'Avbryt',
    assistantFirstMessage: t('ai_assistant.assistant_first_message'),
    feedback: {
      thumbsUp: t('ai_assistant.feedback_thumbs_up'),
      thumbsDown: t('ai_assistant.feedback_thumbs_down'),
      thanksHeading: t('ai_assistant.feedback_thanks_heading'),
      elaboratePrompt: t('ai_assistant.feedback_elaborate_prompt'),
      commentPlaceholder: t('ai_assistant.feedback_comment_placeholder'),
      submit: t('ai_assistant.feedback_submit'),
    },
  };

  if (!userHasAccessToAssistant) {
    return (
      <StudioCenter>
        <StudioAlert>
          <StudioParagraph>{t('ai_assistant.access_denied_1')}</StudioParagraph>
          <StudioParagraph>{t('ai_assistant.access_denied_2')}</StudioParagraph>
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
        activeThreadId={currentSessionId}
        onSubmitMessage={onSubmitMessage}
        onCancelWorkflow={cancelCurrentWorkflow}
        cancelledMessageContent={cancelledMessageContent}
        onCancelledMessageConsumed={clearCancelledMessageContent}
        onSelectThread={selectThread}
        onCreateThread={clearCurrentSession}
        onDeleteThread={deleteThread}
        connectionStatus={connectionStatus}
        workflowStatus={workflowStatus}
        previewContent={<Preview />}
        fileBrowserContent={<FileBrowser />}
        currentUser={currentUser}
        onMessageFeedback={handleMessageFeedback}
      />
    </div>
  );
}

export default AiAssistant;
