import type { ReactElement } from 'react';
import React from 'react';
import type { AssistantTexts } from '@studio/assistant';
import { Assistant } from '@studio/assistant';
import { useTranslation } from 'react-i18next';
import { useAltinityAssistant, useAltinityPermissions } from './hooks';
import { Preview } from './components/Preview';
import { FileBrowser } from './components/FileBrowser';
import classes from './AiAssistant.module.css';
import { useUserQuery } from 'app-shared/hooks/queries';
import { StudioCenter, StudioAlert, StudioParagraph } from '@studio/components';

function AiAssistant(): ReactElement {
  const { t } = useTranslation();
  const { data: currentUser } = useUserQuery();
  const userHasAccessToAssistant = useAltinityPermissions();

  const {
    connectionStatus,
    workflowStatus,
    chatThreads,
    currentSessionId,
    onSubmitMessage,
    selectThread,
    createNewThread,
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
        activeThreadId={currentSessionId}
        onSubmitMessage={onSubmitMessage}
        onSelectThread={selectThread}
        onCreateThread={createNewThread}
        onDeleteThread={deleteThread}
        connectionStatus={connectionStatus}
        workflowStatus={workflowStatus}
        previewContent={<Preview />}
        fileBrowserContent={<FileBrowser />}
        currentUser={currentUser}
      />
    </div>
  );
}

export default AiAssistant;
