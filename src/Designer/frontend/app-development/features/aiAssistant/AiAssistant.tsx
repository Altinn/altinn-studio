import type { ReactElement } from 'react';
import React, { useState } from 'react';
import {
  type UserMessage,
  type ChatThread,
  type AssistantTexts,
  Assistant,
  mockChatThreads,
} from '@studio/assistant';
import { useTranslation } from 'react-i18next';

export function AiAssistant(): ReactElement {
  const { t } = useTranslation();

  // TODO: Fetch data from backend
  const [chatThreads] = useState<ChatThread[]>(mockChatThreads);

  // TODO: Connect to backend
  const onSubmitMessage = (message: UserMessage): void => {
    alert(`Du har trykket på send-knappen.\nMelding fra tekstfelt: ${message.content}`);
  };

  const texts: AssistantTexts = {
    heading: t('ai_assistant.heading'),
    preview: t('ai_assistant.preview'),
    fileBrowser: t('ai_assistant.file_browser'),
    hideThreads: t('ai_assistant.hide_threads'),
    showThreads: t('ai_assistant.show_threads'),
    newThread: t('ai_assistant.new_thread'),
    previousThreads: t('ai_assistant.threads'),
    aboutAssistant: t('ai_assistant.about_assistant'),
    textareaPlaceholder: t('ai_assistant.textarea_placeholder'),
    addAttachment: t('ai_assistant.add_attachment'),
    allowAppChangesSwitch: t('ai_assistant.allow_app_changes'),
    send: t('ai_assistant.send'),
    assistantFirstMessage: t('ai_assistant.assistant_first_message'),
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
