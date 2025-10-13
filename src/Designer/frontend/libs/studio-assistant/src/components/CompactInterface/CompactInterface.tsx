import React from 'react';
import type { Message } from '../../types/ChatThread';
import { ChatColumn } from '../ChatColumn/ChatColumn';
import classes from './CompactInterface.module.css';
import type { ReactElement } from 'react';
import { HeadingBar } from '../HeadingBar/HeadingBar';
import { createAssistantGreetingMessage } from '../../utils/utils';
import type { AssistantProps } from '../../Assistant/Assistant';

export type CompactInterfaceProps = Omit<AssistantProps, 'enableCompactInterface' | 'chatThreads'>;

/**
 * A one-column version of the chat interface without thread history, preview and code viewer.
 * Typical usage is as a pop-up assistant in the lower right of the browser window.
 */
export function CompactInterface({ texts, onSubmitMessage }: CompactInterfaceProps): ReactElement {
  const greetingMessage: Message = createAssistantGreetingMessage(texts.assistantFirstMessage);

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
