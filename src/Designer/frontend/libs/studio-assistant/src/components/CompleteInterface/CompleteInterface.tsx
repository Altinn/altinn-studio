import React, { useState } from 'react';
import type { ReactElement } from 'react';
import { StudioResizableLayout } from '@studio/components';
import { ToolColumn } from '../ToolColumn/ToolColumn';
import classes from './CompleteInterface.module.css';
import { HeadingBar } from '../HeadingBar/HeadingBar';
import type { ChatThread } from '../../types/ChatThread';
import { ThreadColumn } from '../ThreadColumn/ThreadColumn';
import { ThreadColumnCollapsed } from '../ThreadColumnCollapsed/ThreadColumnCollapsed';
import { ChatColumn } from '../ChatColumn/ChatColumn';
import { ToolColumnMode } from '../../types/ToolColumnMode';
import { createNewChatThread, findThreadById } from '../../utils/utils';
import type { AssistantProps } from '../../Assistant/Assistant';

type CompleteInterfaceProps = Omit<AssistantProps, 'enableCompactInterface'>;

/**
 * Full page version of the chat interface with thread history, preview and code viewer.
 */
export function CompleteInterface({
  texts,
  chatThreads = [],
  onSubmitMessage,
}: CompleteInterfaceProps): ReactElement {
  const [isThreadColumnCollapsed, setIsThreadColumnCollapsed] = useState(false);
  const [toolColumnMode, setToolColumnMode] = useState<ToolColumnMode>(ToolColumnMode.Preview);
  const [currentThread, setCurrentThread] = useState<ChatThread>(
    chatThreads[0] ?? createNewChatThread(texts.newThread),
  );

  const handleToggleCollapse = () => setIsThreadColumnCollapsed(!isThreadColumnCollapsed);

  const handleChangeThread = (threadId: string) => {
    const thread = findThreadById(chatThreads, threadId);
    thread && setCurrentThread(thread);
  };

  return (
    <div className={classes.container}>
      <HeadingBar
        texts={texts}
        selectedToolColumnMode={toolColumnMode}
        onModeChange={setToolColumnMode}
      />
      <StudioResizableLayout.Container orientation='horizontal' localStorageContext='ai-chat'>
        <StudioResizableLayout.Element
          minimumSize={200}
          maximumSize={350}
          collapsed={isThreadColumnCollapsed}
          collapsedSize={80}
        >
          {isThreadColumnCollapsed ? (
            <ThreadColumnCollapsed texts={texts} onToggleCollapse={handleToggleCollapse} />
          ) : (
            <ThreadColumn
              texts={texts}
              chatThreads={chatThreads}
              selectedThreadId={currentThread.id}
              onSelectThread={handleChangeThread}
              onToggleCollapse={handleToggleCollapse}
            />
          )}
        </StudioResizableLayout.Element>
        <StudioResizableLayout.Element minimumSize={400}>
          <ChatColumn
            texts={texts}
            messages={currentThread?.messages ?? []}
            onSubmitMessage={onSubmitMessage}
            enableCompactInterface={false}
          />
        </StudioResizableLayout.Element>
        <StudioResizableLayout.Element minimumSize={200}>
          <ToolColumn mode={toolColumnMode} />
        </StudioResizableLayout.Element>
      </StudioResizableLayout.Container>
    </div>
  );
}
