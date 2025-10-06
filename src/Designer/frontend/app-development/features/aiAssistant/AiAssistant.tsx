import type { ReactElement } from 'react';
import React, { useState } from 'react';
import {
  AdvancedChatInterface,
  getMockChatThreads,
  type Message,
  type ChatThread,
} from '@studio/assistant';
import { useTranslation } from 'react-i18next';
import classes from './AiAssistant.module.css';
import { ChatColumn } from '@studio/assistant';

export function AiAssistant(): ReactElement {
  const { t } = useTranslation();
  const [chatThreads] = useState<ChatThread[]>(getMockChatThreads());
  const [currentThreadId, setCurrentThreadId] = useState<string>(chatThreads[0]?.id);
  const [allowEditing, setAllowEditing] = useState<boolean>(false);
  const [useAdvancedMode] = useState<boolean>(true);

  const sidePanelLabels = {
    preview: t('ai_assistant.panel.preview'),
    fileBrowser: t('ai_assistant.panel.fileBrowser'),
  };

  const onSubmitMessage = (message: Message): void => {
    alert(`Du har trykket på send-knappen.\nMelding fra tekstfelt: ${message.content}`);
  };

  const currentThread = chatThreads.find((thread) => thread.id === currentThreadId);

  if (useAdvancedMode) {
    return (
      <div className={classes.container}>
        <AdvancedChatInterface
          chatThreads={chatThreads}
          currentThreadId={currentThreadId}
          onSelectThread={setCurrentThreadId}
          onSendMessage={onSubmitMessage}
          sendButtonText={t('ai_assistant.button.send')}
          allowEditing={allowEditing}
          onModeChange={setAllowEditing}
          textareaPlaceholder={t('ai_assistant.textarea.placeholder')}
          sidePanelLabels={sidePanelLabels}
        />
      </div>
    );
  }

  return (
    <div className={classes.container}>
      <ChatColumn
        messages={currentThread?.messages || []}
        onSendMessage={onSubmitMessage}
        sendButtonText={t('ai_assistant.button.send')}
        allowEditing={allowEditing}
        onModeChange={setAllowEditing}
        textareaPlaceholder={t('ai_assistant.textarea.placeholder')}
      />
    </div>
  );
}
