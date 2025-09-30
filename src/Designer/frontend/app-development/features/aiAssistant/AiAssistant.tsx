import type { ReactElement } from 'react';
import React from 'react';
import { AssistantImpl } from '@studio/assistant';
import { StudioPageSpinner, StudioPageError } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { AssistantConfig as AssistantProps, ButtonTexts, Message } from '@studio/assistant/';

export function AiAssistant(): React.ReactElement {
  const { t } = useTranslation();
  const status: string = 'success';

  switch (status) {
    case 'pending':
      return <StudioPageSpinner spinnerTitle={t('general.loading')} />;
    case 'error':
      return <StudioPageError message={t('general.fetch_error_title')} />;
    case 'success':
      return (
        <AiAssistantWithData
          heading={t('ai_assistant.heading')}
          buttonTexts={buttonTexts}
          onSubmitMessage={onSubmitMessage}
        />
      );
  }
}

function AiAssistantWithData({
  heading,
  buttonTexts,
  onSubmitMessage,
}: AssistantProps): ReactElement {
  const { getAssistant } = new AssistantImpl({
    heading,
    buttonTexts,
    onSubmitMessage,
  });

  return <div>{getAssistant()}</div>;
}

const buttonTexts: ButtonTexts = { send: 'Send' };

const onSubmitMessage = (message: Message): void => {
  alert(`Du har trykket på send-knappen.\nMelding fra tekstfelt: ${message.content}`);
};
