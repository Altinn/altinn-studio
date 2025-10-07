import type { ReactElement } from 'react';
import React, { useState } from 'react';
import {
  InterfaceAdvanced,
  getMockChatThreads,
  type Message,
  type ChatThread,
  type AssistantTexts,
} from '@studio/assistant';
import { useTranslation } from 'react-i18next';
import classes from './AiAssistant.module.css';
import { InterfaceSimple } from '@studio/assistant';

export function AiAssistant(): ReactElement {
  const { t } = useTranslation();
  const [chatThreads] = useState<ChatThread[]>(getMockChatThreads());
  const [isAdvancedModeEnabled] = useState<boolean>(true);

  const onSubmitMessage = (message: Message): void => {
    alert(`Du har trykket på send-knappen.\nMelding fra tekstfelt: ${message.content}`);
  };

  const texts: AssistantTexts = {
    heading: t('ai_assistant.heading'),
    preview: t('ai_assistant.panel.preview'),
    fileBrowser: t('ai_assistant.panel.fileBrowser'),
    hideThreads: 'Skjul tråder',
    newThread: 'Ny tråd',
    previousThreads: 'Tidligere tråder',
    aboutAssistant: 'Om assistenten',
    textareaPlaceholder: t('ai_assistant.textarea.placeholder'),
    addAttachment: 'Last opp vedlegg',
    agentModeLabel: 'Tillat endringer i appen',
    send: t('ai_assistant.button.send'),
  };

  if (isAdvancedModeEnabled) {
    return (
      <div className={classes.container}>
        <InterfaceAdvanced
          texts={texts}
          chatThreads={chatThreads}
          onSubmitMessage={onSubmitMessage}
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
