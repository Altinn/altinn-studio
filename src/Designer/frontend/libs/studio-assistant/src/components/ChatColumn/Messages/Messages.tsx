import React from 'react';
import type { ReactElement } from 'react';
import { StudioCard, StudioParagraph, StudioAvatar, StudioTag } from '@studio/components';
import type { User } from 'app-shared/types/Repository';
import { MessageAuthor } from '../../../types/MessageAuthor';
import { Message } from '../../../types/AssistantConfig';
import classes from './Messages.module.css';
import assistantLogo from '../../../../../../app-development/features/aiAssistant/altinity-logo.png';

type MessagesProps = {
  messages: Message[];
  currentUser?: User;
  assistantAvatarUrl?: string;
};

export function Messages({
  messages,
  currentUser,
  assistantAvatarUrl,
}: MessagesProps): ReactElement {
  return (
    <div className={classes.messagesContainer}>
      {messages.map((message, index) => (
        <Message
          key={index}
          message={message}
          currentUser={currentUser}
          assistantAvatarUrl={assistantAvatarUrl}
        />
      ))}
    </div>
  );
}

type MessageProps = {
  message: Message;
  currentUser?: User;
  assistantAvatarUrl?: string;
};

function Message({ message, currentUser, assistantAvatarUrl }: MessageProps) {
  const isUser = message.author === MessageAuthor.User;

  const renderAvatar = (type: 'user' | 'assistant') => {
    const label = type === 'user' ? (currentUser?.full_name ?? 'Deg') : 'Altinny';

    if (type === 'assistant') {
      return (
        <div
          className={`${classes.avatar} ${classes.assistantAvatarWrapper}`}
          aria-label={label}
          title={label}
        >
          <img
            src={assistantAvatarUrl ?? assistantLogo}
            alt={label}
            className={classes.assistantAvatarImage}
          />
        </div>
      );
    }

    return (
      <StudioAvatar
        src={currentUser?.avatar_url}
        className={`${classes.avatar} ${classes.avatarUser}`}
        aria-label={label}
        title={label}
      />
    );
  };

  if (isUser) {
    return (
      <div className={`${classes.messageRow} ${classes.userRow}`}>
        <div className={classes.messageWrapper}>
          <div className={classes.messageMeta}>{currentUser?.full_name ?? 'Deg'}</div>
          <StudioCard className={classes.userMessage}>
            <StudioParagraph className={classes.messageBody}>{message.content}</StudioParagraph>
          </StudioCard>
        </div>
        {renderAvatar('user')}
      </div>
    );
  }

  // Basic text formatting for assistant messages
  const formatContent = (content: string) => {
    // First, convert markdown to HTML
    let html = content.trim();

    html = html
      .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
      .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
      .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>')
      .replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<!\*)\*(?!\*)(.*?)\*(?!\*)/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');

    html = html.replace(/(?:<li>.*?<\/li>\s*)+/g, (match) => {
      const listItems = match.replace(/\s+/g, ' ').replace(/\s*<\/li>/g, '</li>');
      return `<ul>${listItems}</ul>`;
    });

    const blocks = html
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter(Boolean);
    html = blocks
      .map((block) => {
        if (/^<(h[1-6]|ul|ol|pre|blockquote|table)/.test(block)) {
          return block;
        }
        const withLineBreaks = block.replace(/\n/g, '<br>');
        return `<p>${withLineBreaks}</p>`;
      })
      .join('');

    return html;
  };

  const renderFilesChanged = () => {
    if (message.author !== MessageAuthor.Assistant) return null;

    const assistantMessage = message;
    if (!assistantMessage.filesChanged || assistantMessage.filesChanged.length === 0) return null;

    return (
      <div className={classes.filesSection}>
        <span className={classes.filesSectionTitle}>Files Modified</span>
        <div className={classes.fileCards}>
          {assistantMessage.filesChanged.map((filePath) => {
            const parts = filePath.split('/');
            const fileName = parts.pop() ?? filePath;
            const directory = parts.join('/');

            return (
              <button
                key={filePath}
                type='button'
                className={classes.fileCard}
                title={filePath}
                data-file-path={filePath}
              >
                <StudioTag data-color='accent'>{fileName}</StudioTag>
                {directory && <span className={classes.fileCardDirectory}>{directory}</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`${classes.messageRow} ${classes.assistantRow}`}>
      {renderAvatar('assistant')}
      <div className={classes.assistantMessage}>
        <div className={classes.messageMeta}>Altinny</div>
        <div
          className={classes.assistantBody}
          dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
        />
        {renderFilesChanged()}
      </div>
    </div>
  );
}
