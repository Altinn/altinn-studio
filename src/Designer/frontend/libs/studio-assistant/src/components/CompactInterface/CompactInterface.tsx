import React from 'react';
import type { Message } from '../../types/ChatThread';
import { ChatColumn } from '../ChatColumn/ChatColumn';
import classes from './CompactInterface.module.css';
import type { ReactElement } from 'react';
import { HeadingBar } from '../HeadingBar/HeadingBar';
import { createAssistantMessage } from '../../utils/utils';
import type { AssistantProps } from '../../Assistant/Assistant';
import type { AssistantTexts } from '../../types/AssistantTexts';

export type CompactInterfaceProps = {
  texts: AssistantTexts;
  onSubmitMessage: AssistantProps['onSubmitMessage'];
};

/**
 * A one-column version of the chat interface without thread history, preview and code viewer.
 * Typical usage is as a pop-up assistant in the lower right corner of the browser window.
 */
export function CompactInterface({ texts, onSubmitMessage }: CompactInterfaceProps): ReactElement {
  const greetingMessage: Message = createAssistantMessage(texts.assistantFirstMessage);

  return (
    <div className={classes.compactInterface}>
      <HeadingBar texts={texts} />
      <ChatColumn
        texts={texts}
        messages={[greetingMessage]}
        onSubmitMessage={onSubmitMessage}
        enableCompactInterface={true}
      />
    </div>
  );
}
