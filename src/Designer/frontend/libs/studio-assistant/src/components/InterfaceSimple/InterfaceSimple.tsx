import type { AssistantConfig, AssistantTexts, Message } from '../../types/AssistantConfig';
import { ChatColumn } from '../ChatColumn';
import { MessageAuthor } from '../../types/MessageAuthor';
import classes from './InterfaceSimple.module.css';
import type { ReactElement } from 'react';
import { AssistantHeadingBar } from '../AssistantHeading/AssistantHeading';
import type { UserInputFlags } from '../ChatColumn/UserInput/UserInput';

export type InterfaceSimpleProps = {
  texts: AssistantTexts;
  onSubmitMessage: AssistantConfig['onSubmitMessage'];
};

export function InterfaceSimple({ texts, onSubmitMessage }: InterfaceSimpleProps): ReactElement {
  const greetingMessage: Message = {
    author: MessageAuthor.Assistant,
    content: 'Hva kan jeg hjelpe med?',
    timestamp: new Date(),
  };

  const simpleModeFlags: UserInputFlags = {
    attachmentButton: false,
    agentModeSwitch: false,
  };

  return (
    <div className={classes.interfaceSimple}>
      <AssistantHeadingBar texts={texts} />
      <ChatColumn
        texts={texts}
        messages={[greetingMessage]}
        onSubmitMessage={onSubmitMessage}
        flags={simpleModeFlags}
      />
    </div>
  );
}
