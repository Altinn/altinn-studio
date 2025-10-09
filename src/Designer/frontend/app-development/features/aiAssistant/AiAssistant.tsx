import type { ReactElement } from 'react';
import React, { useState } from 'react';
import {
  type Message,
  type ChatThread,
  type AssistantTexts,
  Assistant,
  mockChatThreads,
} from '@studio/assistant';
import { useTranslation } from 'react-i18next';

export function AiAssistant(): ReactElement {
  const { t } = useTranslation();
  const [chatThreads] = useState<ChatThread[]>(mockChatThreads);

  const onSubmitMessage = (message: Message): void => {
    alert(`Du har trykket på send-knappen.\nMelding fra tekstfelt: ${message.content}`);
  };

  const texts: AssistantTexts = {
    heading: t('ai_assistant.heading'),
    preview: t('ai_assistant.panel.preview'),
    fileBrowser: t('ai_assistant.panel.fileBrowser'),
    hideThreads: 'Skjul tråder',
    newThread: 'Ny tråd',
    previousThreads: 'Tråder',
    aboutAssistant: 'Om assistenten',
    textareaPlaceholder: t('ai_assistant.textarea.placeholder'),
    addAttachment: 'Last opp vedlegg',
    agentModeLabel: 'Tillat endringer i appen',
    send: t('ai_assistant.button.send'),
  };

  return (
    <Assistant
      texts={texts}
      enableCompactInterface={false}
      chatThreads={chatThreads}
      onSubmitMessage={onSubmitMessage}
    />
  );
}
