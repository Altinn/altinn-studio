import React from 'react';
import type { ReactElement } from 'react';
import { StudioCard, StudioParagraph } from '@studio/components';
import { MessageAuthor } from '../../../types/MessageAuthor';
import type { Message } from '../../../types/ChatThread';
import classes from './Messages.module.css';

export type MessagesProps = {
  messages: Message[];
};

export function Messages({ messages }: MessagesProps): ReactElement {
  return (
    <div className={classes.messagesContainer}>
      {messages.map((message, index) => (
        <MessageItem key={index} message={message} />
      ))}
    </div>
  );
}

type MessageItemProps = {
  message: Message;
};

function MessageItem({ message }: MessageItemProps): ReactElement {
  const isUser = message.author === MessageAuthor.User;

  return isUser ? (
    <StudioCard className={classes.userMessage}>{message.content}</StudioCard>
  ) : (
    <StudioParagraph className={classes.assistantMessage}>{message.content}</StudioParagraph>
  );
}
