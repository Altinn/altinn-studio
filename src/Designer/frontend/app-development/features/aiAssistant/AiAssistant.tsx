import type { ReactElement } from 'react';
import React, { useState } from 'react';
import {
  AdvancedChatInterface,
  SimpleChatInterface,
  getMockChatThreads,
  type Message,
  type ModeOption,
  type ChatThread,
} from '@studio/assistant';
import { useTranslation } from 'react-i18next';
import classes from './AiAssistant.module.css';

export function AiAssistant(): ReactElement {
  const { t } = useTranslation();
  const [chatThreads] = useState<ChatThread[]>(getMockChatThreads());
  const [currentThreadId, setCurrentThreadId] = useState<string>(chatThreads[0]?.id);
  const [selectedMode, setSelectedMode] = useState<string>('ask');
  const [useAdvancedMode] = useState<boolean>(true);

  const modeOptions: ModeOption[] = [
    { value: 'ask', label: t('ai_assistant.mode.ask') },
    { value: 'edit', label: t('ai_assistant.mode.edit') },
  ];

  const sidePanelLabels = {
    preview: t('ai_assistant.panel.preview'),
    diff: t('ai_assistant.panel.diff'),
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
          modeOptions={modeOptions}
          selectedMode={selectedMode}
          onModeChange={setSelectedMode}
          textareaPlaceholder={t('ai_assistant.textarea.placeholder')}
          sidePanelLabels={sidePanelLabels}
        />
      </div>
    );
  }

  return (
    <div className={classes.container}>
      <SimpleChatInterface
        messages={currentThread?.messages || []}
        onSendMessage={onSubmitMessage}
        sendButtonText={t('ai_assistant.button.send')}
        modeOptions={modeOptions}
        selectedMode={selectedMode}
        onModeChange={setSelectedMode}
        textareaPlaceholder={t('ai_assistant.textarea.placeholder')}
      />
    </div>
  );
}
