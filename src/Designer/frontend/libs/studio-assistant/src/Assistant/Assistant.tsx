import React, { useState } from 'react';
import { StudioButton, StudioHeading, StudioTextarea } from '@studio/components';
import type { AssistantConfig as AssistantProps, Message } from '../types/AssistantConfig';
import { createUserMessage } from '../utils/utils';
import classes from './Assistant.module.css';

export function Assistant({
  heading,
  texts: buttonTexts,
  onSubmitMessage,
}: AssistantProps): React.ReactElement {
  const [messageContent, setMessageContent] = useState<string>('');

  const handleSubmit = () => {
    const message: Message = createUserMessage(messageContent);
    onSubmitMessage(message);
  };

  return (
    <div className={classes.assistantContainer}>
      <StudioHeading>{heading}</StudioHeading>
      <StudioTextarea onChange={(e) => setMessageContent(e.target.value)} />
      <StudioButton onClick={handleSubmit}>{buttonTexts.send}</StudioButton>
    </div>
  );
}
