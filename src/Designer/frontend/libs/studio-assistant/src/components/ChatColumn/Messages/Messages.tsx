import React from 'react';
import type { ReactElement } from 'react';
import { StudioCard, StudioParagraph } from '@studio/components';
import { MessageAuthor } from '../../../types/MessageAuthor';
import { Message } from '../../../types/ChatThread';
import classes from './Messages.module.css';

type MessagesProps = {
  messages: Message[];
};

export function Messages({ messages }: MessagesProps): ReactElement {
  return (
    <div className={classes.messagesContainer}>
      {messages.map((message, index) => (
        <Message key={index} message={message} />
      ))}
    </div>
  );
}

type MessageProps = {
  message: Message;
};

function Message({ message }: MessageProps) {
  const isUser = message.author === MessageAuthor.User;

  return isUser ? (
    <StudioCard className={classes.userMessage}>{message.content}</StudioCard>
  ) : (
    <StudioParagraph className={classes.assistantMessage}>{message.content}</StudioParagraph>
  );
}
