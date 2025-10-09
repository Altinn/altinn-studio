import React, { useState } from 'react';
import type { ReactElement } from 'react';
import { StudioResizableLayout } from '@studio/components-legacy';
import { ToolColumn } from '../ToolColumn/ToolColumn';
import classes from './CompleteInterface.module.css';
import { HeadingBar } from '../HeadingBar/HeadingBar';
import type { ChatThread } from '../../types/ChatThread';
import { ThreadColumn } from '../ThreadColumn/ThreadColumn';
import { ThreadColumnCollapsed } from '../ThreadColumnHidden/ThreadColumnHidden';
import { ChatColumn } from '../ChatColumn/ChatColumn';
import { ViewType } from '../../types/ViewType';
import { createEmptyChatThread } from '../../utils/utils';
import type { AssistantProps } from '../../Assistant/Assistant';

type CompleteInterfaceProps = Omit<AssistantProps, 'enableCompactInterface'>;

/**
 * Full page version of the chat interface with thread history, preview and code viewer.
 */
export function CompleteInterface({
  texts,
  chatThreads,
  onSubmitMessage,
}: CompleteInterfaceProps): ReactElement {
  const [isThreadColumnCollapsed, setIsThreadColumnCollapsed] = useState(false);
  const [selectedToolView, setSelectedView] = useState<ViewType>(ViewType.Preview);
  const [currentThread, setCurrentThread] = useState<ChatThread>(
    chatThreads[0] ?? createEmptyChatThread(),
  );

  const handleToggleCollapse = () => setIsThreadColumnCollapsed(!isThreadColumnCollapsed);

  const handleChangeThread = (threadId: string) => {
    const thread = chatThreads.find((t) => t.id === threadId);
    setCurrentThread(thread);
  };

  return (
    <div className={classes.container}>
      <HeadingBar texts={texts} selectedView={selectedToolView} onViewChange={setSelectedView} />
      <div className={classes.resizableWrapper}>
        <StudioResizableLayout.Container orientation='horizontal' localStorageContext='ai-chat'>
          <StudioResizableLayout.Element
            minimumSize={200}
            maximumSize={350}
            collapsed={isThreadColumnCollapsed}
            collapsedSize={80}
          >
            {isThreadColumnCollapsed ? (
              <ThreadColumnCollapsed onToggle={handleToggleCollapse} />
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
            <ToolColumn selectedView={selectedToolView} />
          </StudioResizableLayout.Element>
        </StudioResizableLayout.Container>
      </div>
    </div>
  );
}
