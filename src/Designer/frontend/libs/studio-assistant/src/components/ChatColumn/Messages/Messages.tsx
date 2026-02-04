import React from 'react';
import type { ReactElement } from 'react';
import {
  StudioCard,
  StudioParagraph,
  StudioAvatar,
  StudioTag,
  StudioSpinner,
} from '@studio/components';
import { PaperclipIcon } from '@studio/icons';
import type { User } from '../../../types/User';
import { MessageAuthor } from '../../../types/MessageAuthor';
import classes from './Messages.module.css';
import assistantLogo from '../../../../../../app-development/features/aiAssistant/altinity-logo.png';
import type {
  Message,
  UserAttachment,
  UserMessage,
  Source,
} from 'libs/studio-assistant/src/types/ChatThread';

export type MessagesProps = {
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
        <MessageItem
          key={index}
          message={message}
          currentUser={currentUser}
          assistantAvatarUrl={assistantAvatarUrl}
        />
      ))}
    </div>
  );
}

type MessageItemProps = {
  message: Message;
  currentUser?: User;
  assistantAvatarUrl?: string;
};

function MessageItem({ message, currentUser, assistantAvatarUrl }: MessageItemProps): ReactElement {
  const isUser = message.author === MessageAuthor.User;

  const renderUserAttachments = (attachments: UserAttachment[]): ReactElement | null => {
    if (!attachments || attachments.length === 0) {
      return null;
    }

    return (
      <ul className={classes.userAttachments}>
        {attachments.map((attachment, index) => {
          const isImage = attachment.mimeType?.startsWith('image/');
          const key = `${attachment.name}-${attachment.size}-${index}`;

          return (
            <li key={key} className={classes.userAttachmentItem}>
              {isImage ? (
                <img
                  src={attachment.dataBase64}
                  alt={attachment.name}
                  className={classes.userAttachmentImage}
                />
              ) : (
                <span className={classes.userAttachmentIcon} aria-hidden={true}>
                  <PaperclipIcon />
                </span>
              )}
              <span className={classes.userAttachmentLabel}>{attachment.name}</span>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderAvatar = (type: 'user' | 'assistant'): ReactElement => {
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
    const userMessage = message as UserMessage;
    return (
      <div className={`${classes.messageRow} ${classes.userRow}`}>
        <div className={classes.messageWrapper}>
          <div className={classes.messageMeta}>{currentUser?.full_name ?? 'Deg'}</div>
          <StudioCard className={classes.userMessage}>
            {userMessage.content && (
              <StudioParagraph className={classes.messageBody}>
                {userMessage.content}
              </StudioParagraph>
            )}
            {userMessage.attachments &&
              userMessage.attachments.length > 0 &&
              renderUserAttachments(userMessage.attachments)}
          </StudioCard>
        </div>
        {renderAvatar('user')}
      </div>
    );
  }

  // Remove inline sources section from content since we display them separately
  const cleanSourcesFromContent = (content: string): string => {
    // Remove "Kilder" or "Sources" section and all [Source: ...] lines
    let cleaned = content;

    // Remove the "Kilder" header and subsequent [Source: ...] lines
    cleaned = cleaned.replace(/^Kilder\s*\n(?:\[Source:.*?\]\s*\n?)+/gim, '');
    cleaned = cleaned.replace(/^Sources:?\s*\n(?:\[Source:.*?\]\s*\n?)+/gim, '');

    // Remove standalone [Source: ...] lines
    cleaned = cleaned.replace(/^\[Source:.*?\]\s*$/gim, '');

    // Remove inline sources mentions like "Sources:\n- Source1\n- Source2"
    cleaned = cleaned.replace(/^Sources:?\s*\n(?:[-•]\s*.*?\n?)+/gim, '');

    return cleaned.trim();
  };

  // Enhanced markdown formatting for assistant messages
  const formatContent = (content: string): string => {
    let html = cleanSourcesFromContent(content).trim();

    // Extract and protect code blocks first
    const codeBlocks: string[] = [];
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
      const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
      const lang = language ? ` data-language="${language}"` : '';
      codeBlocks.push(
        `<pre${lang}><code>${code.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`,
      );
      return placeholder;
    });

    // Convert inline code (but not parts of code blocks)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Convert headings
    html = html
      .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
      .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
      .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');

    // Convert bold and italic (avoid conflicts with bullet points)
    html = html
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<![*\w])\*(?!\*)([^\n*]+?)\*(?![*\w])/g, '<em>$1</em>');

    // Convert numbered lists
    html = html.replace(/^\s*(\d+)\.\s+(.*)$/gm, '<oli>$2</oli>');

    // Convert bullet points with better handling
    html = html.replace(/^\s*[•\-*]\s+(.*)$/gm, '<li>$1</li>');

    // Wrap consecutive ordered list items in ol tags
    html = html.replace(/(<oli>.*?<\/oli>\s*)+/g, (match) => {
      return `<ol>${match.replace(/<\/?oli>/g, (tag) => tag.replace('oli', 'li'))}</ol>`;
    });

    // Wrap consecutive list items in ul tags
    html = html.replace(/(<li>.*?<\/li>\s*)+/g, (match) => {
      return `<ul>${match}</ul>`;
    });

    // Split into blocks and handle paragraphs
    const blocks = html
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean);

    html = blocks
      .map((block) => {
        // Don't wrap if it's already a block-level element
        if (/^<(h[1-6]|ul|ol|pre|div|blockquote)/.test(block)) {
          return block;
        }
        // For inline content, convert line breaks to <br> and wrap in <p>
        const withBreaks = block.replace(/\n/g, '<br>');
        return `<p>${withBreaks}</p>`;
      })
      .join('');

    // Restore code blocks
    codeBlocks.forEach((block, index) => {
      html = html.replace(`___CODE_BLOCK_${index}___`, block);
    });

    return html;
  };

  const renderFilesChanged = (): ReactElement | null => {
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

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderSourceItem = (
    source: Source,
    index: number,
    isCited: boolean,
  ): ReactElement | null => (
    <div
      key={`${source.tool}-${index}`}
      className={`${classes.sourceItem} ${!isCited ? classes.sourceItemSecondary : ''}`}
    >
      <div className={classes.sourceHeader}>
        {source.url ? (
          <a
            href={source.url}
            target='_blank'
            rel='noopener noreferrer'
            className={classes.sourceTitle}
          >
            {isCited ? '✅' : '🔗'} {source.title}
          </a>
        ) : (
          <span className={classes.sourceTitle}>
            {isCited ? '✅' : '📄'} {source.title}
          </span>
        )}
        <div className={classes.sourceMetadata}>
          {source.relevance !== undefined && (
            <span className={classes.sourceRelevance}>{Math.round(source.relevance * 100)}%</span>
          )}
          {source.content_length !== undefined && (
            <span className={classes.sourceSize}>{formatFileSize(source.content_length)}</span>
          )}
        </div>
      </div>
      {source.matched_terms && (
        <div className={classes.sourceMatched}>Matched: {source.matched_terms}</div>
      )}
      {source.preview && <div className={classes.sourcePreview}>{source.preview}</div>}
    </div>
  );

  const renderSources = (): ReactElement | null => {
    if (message.author !== MessageAuthor.Assistant) return null;

    const assistantMessage = message;
    if (!assistantMessage.sources || assistantMessage.sources.length === 0) return null;

    const citedSources = assistantMessage.sources.filter((s) => s.cited);
    const otherSources = assistantMessage.sources.filter((s) => !s.cited);

    return (
      <div className={classes.sourcesSection}>
        {citedSources.length > 0 && (
          <>
            <div className={classes.sourcesSectionHeader}>
              <span className={classes.sourcesSectionTitle}>📚 Kilder brukt</span>
              <span className={classes.sourcesSectionCount}>{citedSources.length}</span>
            </div>
            <div className={classes.sourcesList}>
              {citedSources.map((source, index) => renderSourceItem(source, index, true))}
            </div>
          </>
        )}

        {otherSources.length > 0 && (
          <>
            <div
              className={`${classes.sourcesSectionHeader} ${classes.sourcesSectionHeaderSecondary}`}
            >
              <span className={classes.sourcesSectionTitleSecondary}>📖 Tilgjengelige kilder</span>
              <span className={classes.sourcesSectionCount}>{otherSources.length}</span>
            </div>
            <div className={classes.sourcesList}>
              {otherSources.map((source, index) => renderSourceItem(source, index, false))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className={`${classes.messageRow} ${classes.assistantRow}`}>
      {renderAvatar('assistant')}
      <div className={classes.assistantMessage}>
        <div className={classes.messageMeta}>Altinny</div>
        <div className={classes.assistantBody}>
          {message.isLoading && (
            <StudioSpinner data-size='sm' className={classes.inlineSpinner} aria-hidden={true} />
          )}
          <div
            className={`${classes.assistantContent} ${message.isLoading ? classes.loadingText : ''}`}
            dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
          />
        </div>
        {renderSources()}
        {renderFilesChanged()}
      </div>
    </div>
  );
}
