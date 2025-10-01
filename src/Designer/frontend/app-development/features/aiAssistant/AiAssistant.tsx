import type { ReactElement } from 'react';
import React from 'react';
import { AssistantImpl } from '@studio/assistant';
import { useTranslation } from 'react-i18next';
import type { ButtonTexts, Message } from '@studio/assistant/';

export function AiAssistant(): ReactElement {
  const { t } = useTranslation();
  const { getAssistant } = new AssistantImpl({
    heading: t('ai_assistant.heading'),
    buttonTexts,
    onSubmitMessage,
  });

  return <div>{getAssistant()}</div>;
}

const buttonTexts: ButtonTexts = { send: 'Send' };

const onSubmitMessage = (message: Message): void => {
  alert(`Du har trykket på send-knappen.\nMelding fra tekstfelt: ${message.content}`);
};
