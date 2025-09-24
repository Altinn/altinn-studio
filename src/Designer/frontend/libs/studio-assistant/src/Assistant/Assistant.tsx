import React, { useState } from 'react';
import { StudioButton, StudioHeading, StudioTextarea } from '@studio/components';
import type { AssistantConfig as AssistantProps, Message } from '../types/AssistantConfig';
import { createUserMessage } from '../utils/utils';

export function Assistant({
  heading,
  buttonTexts,
  onSubmitMessage,
}: AssistantProps): React.ReactElement {
  const [messageContent, setMessageContent] = useState<string>('');

  const handleSubmit = () => {
    const message: Message = createUserMessage(messageContent);
    onSubmitMessage(message);
  };

  return (
    <>
      <StudioHeading>{heading}</StudioHeading>
      <StudioTextarea onChange={(e) => setMessageContent(e.target.value)} />
      <StudioButton onSubmit={handleSubmit}>{buttonTexts.send}</StudioButton>
    </>
  );
}
