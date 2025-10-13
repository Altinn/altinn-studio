import type { ReactElement } from 'react';
import React, { useState } from 'react';
import { InterfaceAdvanced, type AssistantTexts } from '@studio/assistant';
import { useTranslation } from 'react-i18next';
import classes from './AiAssistant.module.css';
import { InterfaceSimple } from '@studio/assistant';
import { useAltinityAssistant } from './hooks';

export function AiAssistant(): ReactElement {
  const { t } = useTranslation();
  const [isAdvancedModeEnabled] = useState<boolean>(true);

  // Use the Altinity assistant hook
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
    preview: t('ai_assistant.panel.preview'),
    fileBrowser: t('ai_assistant.panel.fileBrowser'),
    hideThreads: 'Skjul tråder',
    newThread: 'Ny tråd',
    previousThreads: 'Tidligere tråder',
    aboutAssistant: 'Om assistenten',
    textareaPlaceholder: workflowStatus.isActive
      ? `Vent litt...`
      : connectionStatus === 'connected'
        ? 'Beskriv hva du ønsker å endre i Altinn appen...'
        : 'Venter på Altinity forbindelse...',
    addAttachment: 'Last opp vedlegg',
    agentModeLabel: 'Tillat endringer i appen',
    send: workflowStatus.isActive ? 'Avbryt' : t('ai_assistant.button.send'),
  };

  if (isAdvancedModeEnabled) {
    return (
      <div className={classes.container}>
        <InterfaceAdvanced
          texts={texts}
          chatThreads={chatThreads}
          activeThreadId={currentSessionId}
          onSubmitMessage={onSubmitMessage}
          onSelectThread={selectThread}
          onCreateThread={createNewThread}
          onDeleteThread={deleteThread}
          connectionStatus={connectionStatus}
        />
      </div>
    );
  }

  return (
    <div className={classes.container}>
      <InterfaceSimple texts={texts} onSubmitMessage={onSubmitMessage} />
    </div>
  );
}
